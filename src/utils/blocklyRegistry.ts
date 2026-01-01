import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';
import { BLOCKLY_BACKDROP_OPTIONS } from '../constants/quizDefaults';

let isRegistered = false;

export const registerBlocklyBlocks = () => {
    if (typeof window === 'undefined') return;
    if (isRegistered) return;

    // Define Custom Blocks
    if (!Blockly.Blocks['motion_movesteps']) {
        Blockly.Blocks['motion_movesteps'] = {
            init: function () {
                this.appendDummyInput().appendField("move").appendField(new Blockly.FieldNumber(10), "STEPS").appendField("steps");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(225);
            }
        };
    }
    javascriptGenerator.forBlock['motion_movesteps'] = function (block: any) {
        const steps = block.getFieldValue('STEPS');
        return `await moveSteps(${steps});\n`;
    };

    if (!Blockly.Blocks['motion_turnright']) {
        Blockly.Blocks['motion_turnright'] = {
            init: function () {
                this.appendDummyInput().appendField("turn right").appendField(new Blockly.FieldNumber(15), "DEGREES").appendField("degrees");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(225);
            }
        };
    }
    javascriptGenerator.forBlock['motion_turnright'] = function (block: any) {
        const degrees = block.getFieldValue('DEGREES');
        return `await turnRight(${degrees});\n`;
    };

    if (!Blockly.Blocks['looks_say']) {
        Blockly.Blocks['looks_say'] = {
            init: function () {
                this.appendValueInput("MESSAGE").setCheck("String").appendField("say");
                this.appendValueInput("SECS").setCheck("Number").appendField("for");
                this.appendDummyInput().appendField("seconds");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(260);
            }
        };
    }
    javascriptGenerator.forBlock['looks_say'] = function (block: any) {
        const message = javascriptGenerator.valueToCode(block, 'MESSAGE', Order.ATOMIC) || '"Hello"';
        const secs = javascriptGenerator.valueToCode(block, 'SECS', Order.ATOMIC) || '2';
        return `await say(${message}, ${secs});\n`;
    };

    if (!Blockly.Blocks['looks_switchbackdrop']) {
        Blockly.Blocks['looks_switchbackdrop'] = {
            init: function () {
                this.appendDummyInput().appendField("switch backdrop to").appendField(new Blockly.FieldDropdown(BLOCKLY_BACKDROP_OPTIONS.map(o => [o.label, o.value])), "BACKDROP");
                this.setPreviousStatement(true, null);
                this.setNextStatement(true, null);
                this.setColour(260);
            }
        };
    }
    javascriptGenerator.forBlock['looks_switchbackdrop'] = function (block: any) {
        const backdrop = block.getFieldValue('BACKDROP');
        return `setBackdrop('${backdrop}');\n`;
    };

    if (!Blockly.Blocks['event_whenflagclicked']) {
        Blockly.Blocks['event_whenflagclicked'] = {
            init: function () {
                this.appendDummyInput().appendField("when").appendField(new Blockly.FieldImage("https://cdn-icons-png.flaticon.com/512/1152/1152912.png", 15, 15, "*")).appendField("clicked");
                this.setNextStatement(true, null);
                this.setColour(120);
            }
        };
    }
    javascriptGenerator.forBlock['event_whenflagclicked'] = function (_block: any) {
        return '// Green Flag Clicked\n';
    };

    // Add reserved words
    javascriptGenerator.addReservedWords('moveSteps,turnRight,say,setBackdrop');

    isRegistered = true;
};
