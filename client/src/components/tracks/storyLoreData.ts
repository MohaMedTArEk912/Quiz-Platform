// Storytelling Narrative Lore & Quest Mapping for Skill Tracks

export interface ChapterLore {
    actTitle: string;
    chapterNumber: number;
    storyTitle: string;
    narrative: string;
    flavorQuote: string;
    keySkills: string[];
    isBossTrial?: boolean;
    bossName?: string;
    recommendedTime: string;
}

/**
 * Returns customized story lore for a track module based on title, level, or index.
 */
export function getChapterStoryLore(
    moduleTitle: string,
    index: number,
    totalModules: number,
    trackCategory: string = 'General'
): ChapterLore {
    const actNumber = Math.min(Math.floor((index / Math.max(totalModules, 1)) * 4) + 1, 4);
    const actRoman = ['I', 'II', 'III', 'IV'][actNumber - 1];

    const categoryLabel = trackCategory && trackCategory !== 'General' ? `${trackCategory.toUpperCase()} ` : '';
    const actTitles: Record<number, string> = {
        1: `ACT ${actRoman}: THE GENESIS FORGE`,
        2: `ACT ${actRoman}: THE EXPEDITION OF STRUCTURE`,
        3: `ACT ${actRoman}: THE STYLISTIC CRUCIBLE`,
        4: `ACT ${actRoman}: THE ${categoryLabel}ARCHITECT'S ASCENT`
    };

    const isLast = index === totalModules - 1;
    const isMidterm = Math.floor(totalModules / 2) === index;
    const isBoss = isLast || isMidterm;

    // Default narrative templates based on position and track theme
    const titleLower = moduleTitle.toLowerCase();

    let narrative = "Every digital architect begins in the unformed void. Unravel the primal syntax, align the building blocks of memory, and forge logic that endures.";
    let flavorQuote = '"In computer science, we build castles in the sky out of pure thought." — Fred Brooks';
    let keySkills = ['Syntax Foundations', 'Mental Models', 'Logic Gates'];
    let bossName: string | undefined = undefined;

    if (titleLower.includes('html') || titleLower.includes('structure') || titleLower.includes('page')) {
        narrative = "Before color and motion awaken the canvas, you must carve the ancient skeletal framework of the DOM. Master the structural bones upon which entire worlds are anchored.";
        flavorQuote = '"The web does not just connect machines, it weaves collective consciousness." — Tim Berners-Lee';
        keySkills = ['DOM Hierarchy', 'Semantic Landmarks', 'Document Flow'];
    } else if (titleLower.includes('media') || titleLower.includes('link') || titleLower.includes('path')) {
        narrative = "An isolated node is powerless; links weave the boundless tapestry. Learn to bridge distant islands with hypertext portals and orchestrate living audio-visual conduits.";
        flavorQuote = '"The journey between two servers begins with a single hyperlinked anchor."';
        keySkills = ['Hypermedia Routing', 'Asset Pipelines', 'Coordinate Paths'];
    } else if (titleLower.includes('form') || titleLower.includes('table') || titleLower.includes('list')) {
        narrative = "Data in the wild is chaotic energy. Gather, validate, and channel human input through disciplined form conduits, translating thoughts into structured matrices.";
        flavorQuote = '"To receive input without validation is to invite entropy into your gates."';
        keySkills = ['Form Telemetry', 'Structured Matrices', 'User Feedback Loops'];
    } else if (titleLower.includes('css') || titleLower.includes('style') || titleLower.includes('color') || titleLower.includes('selector')) {
        narrative = "Awaken visual alchemy. Channel harmonic palettes, calibrate typographic cadence, and bind styling rules to the DOM with mathematical precision.";
        flavorQuote = '"Style is not an afterthought; it is the emotional frequency of your software."';
        keySkills = ['Cascade Specificity', 'Box Model Architecture', 'Visual Harmony'];
    } else if (titleLower.includes('flexbox') || titleLower.includes('grid') || titleLower.includes('layout')) {
        narrative = "The crucible of dynamic space. Command responsive fluid grids, bend horizontal and vertical axes at will, and ensure your creation adapts to every mortal screen.";
        flavorQuote = '"True architecture fluidly reshapes itself to the vessel that holds it."';
        keySkills = ['Flex Dimensionality', 'Grid Matrix Flow', 'Responsive Viewports'];
    } else if (titleLower.includes('python') || titleLower.includes('variable') || titleLower.includes('type')) {
        narrative = "Harness the Serpent's language. Command memory registers with human-readable clarity, declare dynamic containers, and breathe life into inert data streams.";
        flavorQuote = '"Readability counts. Simple is better than complex." — The Zen of Python';
        keySkills = ['Memory Containers', 'Data Typing', 'Dynamic Scopes'];
    } else if (titleLower.includes('loop') || titleLower.includes('iteration') || titleLower.includes('while') || titleLower.includes('for')) {
        narrative = "Step into the infinite wheel of recursion and iteration. Harness deterministic cycles to process galactic datasets in the blink of an instruction cycle.";
        flavorQuote = '"To iterate is human, to recurse divine." — L. Peter Deutsch';
        keySkills = ['Algorithmic Iteration', 'Boundary Conditions', 'Complexity Minimization'];
    } else if (titleLower.includes('scratch') || titleLower.includes('sprite') || titleLower.includes('motion')) {
        narrative = "Enter the creative playground where visual blocks interlock like arcane machinery. Animate visual spirits across the canvas and choreograph kinetic symphonies.";
        flavorQuote = '"Creativity is intelligence having joyful play."';
        keySkills = ['Event Loops', 'Kinetic Translation', 'Coordinate Mapping'];
    } else if (titleLower.includes('exam') || titleLower.includes('final') || isLast) {
        narrative = "The Grand Climax of the Saga. All prior rites of passage culminate here. Prove your unyielding mastery against the crucible assessment to claim the Master's Crest.";
        flavorQuote = '"Only through fire does raw code crystallize into diamond architecture."';
        keySkills = ['Comprehensive Synthesis', 'Edge-Case Resilience', 'Peak Mastery'];
        bossName = 'THE ARCHITECTURAL CRUCIBLE';
    } else if (isMidterm) {
        narrative = "The Gatekeeper's Trial. Halfway through the expedition, you face a comprehensive consolidation gauntlet to verify that your foundations are immutable.";
        flavorQuote = '"A builder who never tests the foundation watches their tower crumble."';
        keySkills = ['Midpoint Synthesis', 'Speed Recall', 'Diagnostic Precision'];
        bossName = 'THE MIDPOINT SENTINEL';
    }

    return {
        actTitle: actTitles[actNumber],
        chapterNumber: index + 1,
        storyTitle: moduleTitle.replace(/^Module\s+\d+:\s*/i, ''),
        narrative,
        flavorQuote,
        keySkills,
        isBossTrial: isBoss,
        bossName: bossName || (isLast ? 'GRAND FINALE GAUNTLET' : undefined),
        recommendedTime: `${15 + (index * 5) % 25} Mins`
    };
}
