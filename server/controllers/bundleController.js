import JSZip from 'jszip';
import mongoose from 'mongoose';
import { Subject } from '../models/Subject.js';
import { SkillTrack } from '../models/SkillTrack.js';
import { Quiz } from '../models/Quiz.js';
import { sanitizeQuestions } from './quizController.js';

/**
 * Helper to generate safe URL/folder slugs
 */
const slugify = (text = '') => {
    return String(text)
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 50) || 'item';
};

const escapeRegex = (str = '') => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * GET /api/subjects/export-bundle
 * Export all roads (or a single road if ?subjectId=...) as a structured ZIP file
 */
export const exportRoadmapBundle = async (req, res) => {
    try {
        const { subjectId } = req.query;

        // Query subjects to export
        const query = subjectId ? { _id: subjectId } : {};
        const subjects = await Subject.find(query).lean();

        if (subjectId && subjects.length === 0) {
            return res.status(404).json({ success: false, message: 'Subject not found for export' });
        }

        const zip = new JSZip();
        const exportDate = new Date().toISOString();
        let totalQuizzesCount = 0;

        const roadsFolder = zip.folder('roads');
        const bundleData = {
            format: 'quiz-platform-roadmap-bundle',
            version: '1.0',
            exportedAt: exportDate,
            roads: [],
            standaloneQuizzes: []
        };

        for (const subject of subjects) {
            const subjectIdStr = subject._id.toString();
            const roadSlug = `${slugify(subject.title)}_${subjectIdStr.slice(-6)}`;
            const roadFolder = roadsFolder.folder(roadSlug);

            // Fetch linked skill track roadmap
            const skillTrack = await SkillTrack.findOne({
                $or: [
                    { subjectId: subject._id },
                    { trackId: subjectIdStr }
                ]
            }).lean();

            // Fetch linked quizzes
            const quizConditions = [{ subjectId: subjectIdStr }];
            if (skillTrack?.trackId) {
                quizConditions.push({ linkedTrackId: skillTrack.trackId });
            }
            const quizzes = await Quiz.find({ $or: quizConditions }).lean();
            totalQuizzesCount += quizzes.length;

            // Sanitize subject data for portable export
            const cleanSubject = {
                _id: subjectIdStr,
                title: subject.title,
                description: subject.description || '',
                icon: subject.icon || 'BookOpen',
                materials: subject.materials || []
            };

            // Sanitize skillTrack data for portable export
            const cleanSkillTrack = skillTrack ? {
                trackId: skillTrack.trackId,
                title: skillTrack.title,
                description: skillTrack.description || '',
                icon: skillTrack.icon || subject.icon || '🗺️',
                category: skillTrack.category || 'General',
                subjectId: subjectIdStr,
                modules: skillTrack.modules || []
            } : null;

            // Sanitize quizzes
            const cleanQuizzes = quizzes.map(q => {
                const copy = { ...q };
                delete copy._id;
                delete copy.__v;
                return copy;
            });

            // Write individual files to road folder
            roadFolder.file('subject.json', JSON.stringify(cleanSubject, null, 2));
            if (cleanSkillTrack) {
                roadFolder.file('roadmap.json', JSON.stringify(cleanSkillTrack, null, 2));
            }

            if (cleanQuizzes.length > 0) {
                const quizzesFolder = roadFolder.folder('quizzes');
                for (const quiz of cleanQuizzes) {
                    const quizFilename = `${slugify(quiz.id || quiz.title)}.json`;
                    quizzesFolder.file(quizFilename, JSON.stringify(quiz, null, 2));
                }
            }

            bundleData.roads.push({
                subject: cleanSubject,
                skillTrack: cleanSkillTrack,
                quizzes: cleanQuizzes
            });
        }

        // If exporting all roads, check for any standalone quizzes without subjects
        if (!subjectId) {
            const subjectIds = subjects.map(s => s._id.toString());
            const standaloneQuizzes = await Quiz.find({
                $or: [
                    { subjectId: { $exists: false } },
                    { subjectId: null },
                    { subjectId: '' },
                    { subjectId: { $nin: subjectIds } }
                ]
            }).lean();

            if (standaloneQuizzes.length > 0) {
                const standaloneFolder = zip.folder('standalone_quizzes');
                const cleanStandalone = standaloneQuizzes.map(q => {
                    const copy = { ...q };
                    delete copy._id;
                    delete copy.__v;
                    return copy;
                });

                for (const q of cleanStandalone) {
                    standaloneFolder.file(`${slugify(q.id || q.title)}.json`, JSON.stringify(q, null, 2));
                }
                bundleData.standaloneQuizzes = cleanStandalone;
                totalQuizzesCount += cleanStandalone.length;
            }
        }

        // Add manifest.json and bundle.json
        const manifest = {
            format: 'quiz-platform-roadmap-bundle',
            version: '1.0',
            exportedAt: exportDate,
            roadsCount: bundleData.roads.length,
            quizzesCount: totalQuizzesCount
        };
        zip.file('manifest.json', JSON.stringify(manifest, null, 2));
        zip.file('bundle.json', JSON.stringify(bundleData, null, 2));

        // Generate binary ZIP buffer
        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        const filename = subjectId && subjects[0]
            ? `road-${slugify(subjects[0].title)}-${exportDate.slice(0, 10)}.zip`
            : `all-roads-bundle-${exportDate.slice(0, 10)}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', zipBuffer.length);

        return res.send(zipBuffer);
    } catch (error) {
        console.error('❌ Error exporting roadmap bundle:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to export roadmap bundle',
            error: error.message
        });
    }
};

/**
 * Helper to parse a zip file or JSON upload into normalized bundle data
 */
const parseUploadedBundle = async (file, rawBody) => {
    // 1. Direct JSON body
    if (!file && rawBody && (rawBody.roads || Array.isArray(rawBody))) {
        if (Array.isArray(rawBody)) {
            return { roads: rawBody, standaloneQuizzes: [] };
        }
        return rawBody;
    }

    if (!file || !file.buffer) {
        throw new Error('No bundle file provided');
    }

    const isZip = file.mimetype.includes('zip') ||
                  file.originalname.toLowerCase().endsWith('.zip');

    if (!isZip) {
        // Assume JSON file
        const text = file.buffer.toString('utf8');
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return { roads: parsed, standaloneQuizzes: [] };
        }
        return parsed;
    }

    // Unpack ZIP using JSZip
    const zip = await JSZip.loadAsync(file.buffer);

    // Fast path: check for bundle.json
    const bundleFile = zip.file('bundle.json');
    if (bundleFile) {
        const bundleJsonText = await bundleFile.async('string');
        return JSON.parse(bundleJsonText);
    }

    // Traverse directory structure
    const roadsMap = new Map(); // roadDir -> { subject, skillTrack, quizzes: [] }
    const standaloneQuizzes = [];

    const filePaths = Object.keys(zip.files);
    for (const relativePath of filePaths) {
        const zipEntry = zip.file(relativePath);
        if (!zipEntry || zipEntry.dir) continue;

        const pathParts = relativePath.split(/[/\\]/);
        // e.g. ["roads", "web-dev_123", "subject.json"]
        // e.g. ["roads", "web-dev_123", "quizzes", "html.json"]

        if (pathParts[0] === 'roads' && pathParts.length >= 3) {
            const roadKey = pathParts[1];
            if (!roadsMap.has(roadKey)) {
                roadsMap.set(roadKey, { subject: null, skillTrack: null, quizzes: [] });
            }
            const roadEntry = roadsMap.get(roadKey);

            const fileContent = await zipEntry.async('string');
            let parsedJson;
            try {
                parsedJson = JSON.parse(fileContent);
            } catch (err) {
                console.warn(`Could not parse JSON in zip: ${relativePath}`);
                continue;
            }

            if (pathParts[2] === 'subject.json') {
                roadEntry.subject = parsedJson;
            } else if (pathParts[2] === 'roadmap.json') {
                roadEntry.skillTrack = parsedJson;
            } else if (pathParts[2] === 'quizzes' && pathParts.length >= 4) {
                roadEntry.quizzes.push(parsedJson);
            }
        } else if (pathParts[0] === 'standalone_quizzes' || (pathParts.length === 2 && pathParts[0] === 'quizzes')) {
            const fileContent = await zipEntry.async('string');
            try {
                const parsedJson = JSON.parse(fileContent);
                standaloneQuizzes.push(parsedJson);
            } catch {
                // skip corrupted
            }
        }
    }

    return {
        roads: Array.from(roadsMap.values()),
        standaloneQuizzes
    };
};

/**
 * POST /api/subjects/import-bundle
 * Imports or updates roads, roadmaps, and quizzes from a ZIP package or JSON bundle.
 * Supports replacing/overwriting existing records.
 */
export const importRoadmapBundle = async (req, res) => {
    try {
        console.log('📦 [importRoadmapBundle] Starting import, file received:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');
        const replaceExisting = req.body.replaceExisting !== 'false' && req.body.replaceExisting !== false;
        const bundle = await parseUploadedBundle(req.file, req.body);
        console.log('📦 [importRoadmapBundle] Bundle parsed successfully. Roads count:', bundle.roads?.length, 'Standalone quizzes:', bundle.standaloneQuizzes?.length);

        const roads = bundle.roads || [];
        const standaloneQuizzes = bundle.standaloneQuizzes || [];

        if (roads.length === 0 && standaloneQuizzes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid roadmaps or quizzes found in the uploaded package'
            });
        }

        const stats = {
            subjectsCreated: 0,
            subjectsUpdated: 0,
            tracksCreated: 0,
            tracksUpdated: 0,
            quizzesCreated: 0,
            quizzesUpdated: 0,
            errors: []
        };

        // Process each road
        for (const road of roads) {
            const subjectData = road.subject;
            if (!subjectData || !subjectData.title) {
                stats.errors.push('Skipped road with missing subject title');
                continue;
            }

            console.log(`📦 [importRoadmapBundle] Processing road "${subjectData.title}" (${(road.quizzes || []).length} quizzes)...`);

            try {
                // 1. Resolve / Upsert Subject
                let existingSubject = null;
                if (subjectData._id && mongoose.Types.ObjectId.isValid(subjectData._id)) {
                    existingSubject = await Subject.findById(subjectData._id);
                }
                if (!existingSubject) {
                    existingSubject = await Subject.findOne({
                        title: { $regex: new RegExp(`^${escapeRegex(subjectData.title)}$`, 'i') }
                    });
                }

                let targetSubject = null;
                if (existingSubject) {
                    if (replaceExisting) {
                        existingSubject.title = subjectData.title;
                        if (subjectData.description !== undefined) existingSubject.description = subjectData.description;
                        if (subjectData.icon) existingSubject.icon = subjectData.icon;
                        if (Array.isArray(subjectData.materials)) existingSubject.materials = subjectData.materials;
                        await existingSubject.save();
                        stats.subjectsUpdated++;
                    }
                    targetSubject = existingSubject;
                } else {
                    const cleanData = { ...subjectData };
                    delete cleanData._id;
                    targetSubject = new Subject(cleanData);
                    await targetSubject.save();
                    stats.subjectsCreated++;
                }

                // 2. Resolve / Upsert SkillTrack (Roadmap)
                const trackData = road.skillTrack;
                let targetTrack = null;
                if (trackData) {
                    const trackLookupConditions = [
                        { subjectId: targetSubject._id }
                    ];
                    if (trackData.trackId) {
                        trackLookupConditions.push({ trackId: trackData.trackId });
                    }
                    if (trackData.title) {
                        trackLookupConditions.push({ title: { $regex: new RegExp(`^${escapeRegex(trackData.title)}$`, 'i') } });
                    }

                    let existingTrack = await SkillTrack.findOne({ $or: trackLookupConditions });

                    if (existingTrack) {
                        if (replaceExisting) {
                            existingTrack.title = trackData.title || targetSubject.title;
                            existingTrack.description = trackData.description !== undefined ? trackData.description : existingTrack.description;
                            if (trackData.icon) existingTrack.icon = trackData.icon;
                            if (trackData.category) existingTrack.category = trackData.category;
                            if (Array.isArray(trackData.modules)) existingTrack.modules = trackData.modules;
                            existingTrack.subjectId = targetSubject._id;
                            await existingTrack.save();
                            stats.tracksUpdated++;
                        }
                        targetTrack = existingTrack;
                    } else {
                        const newTrackId = trackData.trackId || `track-${targetSubject._id}`;
                        targetTrack = new SkillTrack({
                            trackId: newTrackId,
                            title: trackData.title || targetSubject.title,
                            description: trackData.description || targetSubject.description || '',
                            icon: trackData.icon || targetSubject.icon || '🗺️',
                            category: trackData.category || 'General',
                            subjectId: targetSubject._id,
                            modules: trackData.modules || []
                        });
                        await targetTrack.save();
                        stats.tracksCreated++;
                    }
                }

                // 3. Resolve / Upsert Quizzes associated with this road concurrently
                const roadQuizzes = road.quizzes || [];
                await Promise.all(roadQuizzes.map(async (quiz) => {
                    if (!quiz.id || !quiz.title) {
                        stats.errors.push(`Skipped quiz missing id or title: ${JSON.stringify(quiz).slice(0, 40)}`);
                        return;
                    }

                    try {
                        const sanitizedQuestions = sanitizeQuestions(quiz.questions || [], quiz.id);
                        const cleanQuiz = {
                            ...quiz,
                            questions: sanitizedQuestions,
                            subjectId: targetSubject._id.toString(),
                            linkedTrackId: targetTrack ? targetTrack.trackId : quiz.linkedTrackId
                        };
                        delete cleanQuiz._id;
                        delete cleanQuiz.__v;

                        const existingQuiz = await Quiz.findOne({ id: quiz.id }).select('_id');
                        if (existingQuiz) {
                            if (replaceExisting) {
                                await Quiz.findOneAndUpdate(
                                    { id: quiz.id },
                                    { $set: cleanQuiz },
                                    { new: true, setDefaultsOnInsert: true }
                                );
                                stats.quizzesUpdated++;
                            }
                        } else {
                            const newQuiz = new Quiz(cleanQuiz);
                            await newQuiz.save();
                            stats.quizzesCreated++;
                        }
                    } catch (quizErr) {
                        stats.errors.push(`Quiz "${quiz.id}": ${quizErr.message}`);
                    }
                }));
            } catch (roadErr) {
                stats.errors.push(`Road "${subjectData.title}": ${roadErr.message}`);
            }
        }

        // Process any standalone quizzes concurrently
        await Promise.all(standaloneQuizzes.map(async (quiz) => {
            if (!quiz.id || !quiz.title) return;

            try {
                const sanitizedQuestions = sanitizeQuestions(quiz.questions || [], quiz.id);
                const cleanQuiz = {
                    ...quiz,
                    questions: sanitizedQuestions
                };
                delete cleanQuiz._id;
                delete cleanQuiz.__v;

                const existingQuiz = await Quiz.findOne({ id: quiz.id }).select('_id');
                if (existingQuiz) {
                    if (replaceExisting) {
                        await Quiz.findOneAndUpdate(
                            { id: quiz.id },
                            { $set: cleanQuiz },
                            { new: true, setDefaultsOnInsert: true }
                        );
                        stats.quizzesUpdated++;
                    }
                } else {
                    const newQuiz = new Quiz(cleanQuiz);
                    await newQuiz.save();
                    stats.quizzesCreated++;
                }
            } catch (standaloneErr) {
                stats.errors.push(`Standalone quiz "${quiz.id}": ${standaloneErr.message}`);
            }
        }));

        return res.json({
            success: true,
            message: `Import finished. Created ${stats.subjectsCreated} roads, updated ${stats.subjectsUpdated} roads. Created ${stats.quizzesCreated} quizzes, updated ${stats.quizzesUpdated} quizzes.`,
            stats
        });
    } catch (error) {
        console.error('❌ Error importing roadmap bundle:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to import roadmap bundle',
            error: error.message
        });
    }
};
