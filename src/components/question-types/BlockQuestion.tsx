import React, { useState, useRef, useEffect } from 'react';
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { Play, RotateCcw, Cat, Loader2 } from 'lucide-react';
import { DEFAULT_BLOCKLY_TOOLBOX } from '../../constants/quizDefaults.ts';
import { registerBlocklyBlocks } from '../../utils/blocklyRegistry';
import { useNotification } from '../../context/NotificationContext';

// Execute registration
try {
  registerBlocklyBlocks();
} catch (e) {
  console.error("Error registering Blockly blocks:", e);
}

interface BlockQuestionProps {
  initialXml?: string;
  toolbox?: string;
  onChange: (xml: string, code?: string) => void;
  readOnly?: boolean;
  hideStage?: boolean;
  className?: string;
}

interface SpriteState {
  x: number;
  y: number;
  rotation: number;
  bubbleText: string | null;
}

const BlockQuestion: React.FC<BlockQuestionProps> = ({ initialXml, toolbox, onChange, readOnly, hideStage = false, className }) => {
  const { showNotification } = useNotification();
  const [sprite, setSprite] = useState<SpriteState>({ x: 0, y: 0, rotation: 90, bubbleText: null });
  const [backdrop, setBackdrop] = useState('default');
  const [isRunning, setIsRunning] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const isUpdatingRef = useRef(false);

  // Initialize Blockly
  useEffect(() => {
    if (!editorRef.current || workspaceRef.current) return;

    try {
      const workspace = Blockly.inject(editorRef.current, {
        toolbox: readOnly ? undefined : (toolbox || DEFAULT_BLOCKLY_TOOLBOX),
        readOnly: readOnly,
        grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
        zoom: { controls: true, wheel: true, startScale: 0.8, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
        move: { scrollbars: true, drag: true, wheel: true },
        sounds: false,
        scrollbars: true,
      });

      workspaceRef.current = workspace;

      // Initial XML load
      if (initialXml) {
        try {
          isUpdatingRef.current = true;
          const dom = Blockly.utils.xml.textToDom(initialXml);
          Blockly.Xml.domToWorkspace(dom, workspace);
          isUpdatingRef.current = false;
        } catch (e) {
          console.error("Error loading initial XML:", e);
        }
      }

      // Add Change Listener
      const listener = (event: Blockly.Events.Abstract) => {
        if (event.type === Blockly.Events.UI || isUpdatingRef.current) return;

        // Use a timeout to debounce/throttle updates slightly if needed, or just run
        const performUpdate = () => {
          if (!workspaceRef.current) return;
          try {
            const xmlDom = Blockly.Xml.workspaceToDom(workspaceRef.current);
            const xmlText = Blockly.Xml.domToText(xmlDom);
            const code = javascriptGenerator.workspaceToCode(workspaceRef.current);
            onChange(xmlText, code);
          } catch (e) {
            console.error("Error generating update:", e);
          }
        };
        performUpdate();
      };

      workspace.addChangeListener(listener);

      // Resize handle
      const resizeObserver = new ResizeObserver(() => {
        Blockly.svgResize(workspace);
      });
      resizeObserver.observe(editorRef.current);

      return () => {
        resizeObserver.disconnect();
        workspace.dispose();
        workspaceRef.current = null;
      };
    } catch (e) {
      console.error("Blockly Injection Error:", e);
    }
  }, [readOnly, toolbox]); // Re-init if these change (simplified, ideally we update options)

  // Update XML if prop changes externally (and it's not our own update)
  useEffect(() => {
    if (!workspaceRef.current || isUpdatingRef.current || !initialXml) return;

    // Check if current XML matches to avoid reset
    const currentXml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspaceRef.current));
    if (currentXml === initialXml) return;

    // Only load if strictly different and significant? 
    // Usually we don't want to overwrite user work unless it's a reset.
    // Assuming initialXml is truly "initial" or "controlled".
    // For now, let's respect it if it differs significantly, but be careful.
    // Actually, usually controlled components only update on change.

    // Simplification: Do not hot-swap XML to avoid losing cursor state. 
    // Only load on mount (covered above).
  }, [initialXml]);


  const resetStage = () => {
    setSprite({ x: 0, y: 0, rotation: 90, bubbleText: null });
    setBackdrop('default');
    setIsRunning(false);
  };

  const runCode = async () => {
    if (!workspaceRef.current) return;
    setIsRunning(true);
    resetStage();

    await new Promise(r => setTimeout(r, 100));

    let code = '';
    try {
      // Ensure generators are registered
      registerBlocklyBlocks();
      code = javascriptGenerator.workspaceToCode(workspaceRef.current);
    } catch (e) {
      console.error("Error generating code:", e);
      showNotification('error', 'Error generating code. Please check your blocks.');
      setIsRunning(false);
      return;
    }

    let currentX = 0;
    let currentY = 0;
    let currentRot = 90;

    const moveSteps = async (steps: number) => {
      const rad = ((currentRot - 90) * Math.PI) / 180;
      currentX += Math.cos(rad) * steps;
      currentY += Math.sin(rad) * steps;
      currentX = Math.max(-240, Math.min(240, currentX));
      currentY = Math.max(-180, Math.min(180, currentY));
      setSprite(prev => ({ ...prev, x: currentX, y: currentY }));
      await new Promise(r => setTimeout(r, 50));
    };

    const turnRight = async (deg: number) => {
      currentRot += deg;
      setSprite(prev => ({ ...prev, rotation: currentRot }));
      await new Promise(r => setTimeout(r, 50));
    };

    const say = async (msg: string, secs: number) => {
      setSprite(prev => ({ ...prev, bubbleText: msg }));
      await new Promise(r => setTimeout(r, secs * 1000));
      setSprite(prev => ({ ...prev, bubbleText: null }));
    };

    const setBackdropFn = (name: string) => {
      setBackdrop(name);
    };

    try {
      const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
      const run = new AsyncFunction('moveSteps', 'turnRight', 'say', 'setBackdrop', code);
      await run(moveSteps, turnRight, say, setBackdropFn);
    } catch (e) {
      console.error("Runtime Error", e);
    }

    setIsRunning(false);
  };

  const getBackdropStyle = () => {
    switch (backdrop) {
      case 'forest': return 'bg-gradient-to-b from-green-800 to-green-400';
      case 'desert': return 'bg-gradient-to-b from-yellow-300 to-orange-500';
      case 'space': return 'bg-gray-900';
      case 'arctic': return 'bg-gradient-to-b from-blue-100 to-white';
      default: return 'bg-white dark:bg-gray-800';
    }
  };

  return (
    <div className={`flex flex-col lg:flex-row gap-4 ${className || 'h-[700px]'}`}>
      {/* Visual Stage */}
      {!hideStage && (
        <div className="w-full lg:w-[480px] flex-shrink-0 flex flex-col gap-2">
          <div className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden border-4 border-gray-300 dark:border-gray-600 transition-colors duration-500 ${getBackdropStyle()}`}>
            <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
              <div className="w-full h-[1px] bg-black dark:bg-white absolute"></div>
              <div className="h-full w-[1px] bg-black dark:bg-white absolute"></div>
            </div>

            <div
              className="absolute w-12 h-12 flex items-center justify-center transition-transform duration-200"
              style={{
                left: `calc(50% + ${sprite.x}px - 24px)`,
                top: `calc(50% + ${sprite.y * -1}px - 24px)`, // Inverted Y for visual stage logic
                transform: `rotate(${sprite.rotation - 90}deg)`
              }}
            >
              <Cat className="w-full h-full text-orange-500 drop-shadow-md" />
              {sprite.bubbleText && (
                <div className="absolute -top-16 left-full w-max max-w-[150px] bg-white text-black p-2 rounded-xl rounded-bl-sm border-2 border-gray-200 shadow-lg text-xs animate-bounce z-20" style={{ transform: `rotate(-${sprite.rotation - 90}deg)` }}>
                  {sprite.bubbleText}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={runCode} disabled={isRunning} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isRunning ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Running...</>
              ) : (
                <><Play className="w-5 h-5 fill-current" /> Run</>
              )}
            </button>
            <button onClick={resetStage} disabled={isRunning} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors disabled:opacity-50">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded-lg text-gray-500">
            <div>x: {Math.round(sprite.x)}</div>
            <div>y: {Math.round(sprite.y)}</div>
            <div>dir: {Math.round(sprite.rotation)}</div>
            <div>background: {backdrop}</div>
          </div>
        </div>
      )}

      {/* Blockly Editor */}
      <div className="flex-1 h-full border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 relative group">
        <div ref={editorRef} className="w-full h-full" />
        {readOnly && (
          <div className="absolute inset-0 bg-transparent z-10" />
        )}
      </div>
    </div>
  );
};

export default BlockQuestion;
