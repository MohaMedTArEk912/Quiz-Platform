export const COMPILER_ALLOWED_LANGUAGES = ['javascript', 'python', 'typescript'];

export const COMPILER_INITIAL_CODE: Record<string, string> = {
  javascript: '// Write your javascript code here\n',
  typescript: '// Write your typescript code here\n',
  python: '# Write your python code here\nprint("Hello World")\n',
};

export const BLOCKLY_BACKDROP_OPTIONS = [
  { label: "Forest", value: "forest" },
  { label: "Desert", value: "desert" },
  { label: "Space", value: "space" },
  { label: "Arctic", value: "arctic" }
];

export const DEFAULT_BLOCKLY_TOOLBOX = `<xml xmlns="https://developers.google.com/blockly/xml">
  <category name="Motion" colour="#4C97FF">
    <block type="motion_movesteps">
      <value name="STEPS">
        <shadow type="math_number">
          <field name="NUM">10</field>
        </shadow>
      </value>
    </block>
    <block type="motion_turnright">
      <value name="DEGREES">
        <shadow type="math_number">
          <field name="NUM">15</field>
        </shadow>
      </value>
    </block>
  </category>
  <category name="Looks" colour="#9966FF">
    <block type="looks_say">
      <value name="MESSAGE">
        <shadow type="text">
          <field name="TEXT">Hello!</field>
        </shadow>
      </value>
      <value name="SECS">
        <shadow type="math_number">
          <field name="NUM">2</field>
        </shadow>
      </value>
    </block>
    <block type="looks_switchbackdrop"></block>
  </category>
  <category name="Events" colour="#FFBF00">
    <block type="event_whenflagclicked"></block>
  </category>
  <sep></sep>
  <category name="Control" colour="#FFAB19">
    <block type="controls_repeat_ext">
        <value name="TIMES">
            <shadow type="math_number"><field name="NUM">10</field></shadow>
        </value>
    </block>
    <block type="controls_if"></block>
    <block type="controls_whileUntil"></block>
    <block type="controls_for">
      <value name="FROM">
        <shadow type="math_number"><field name="NUM">1</field></shadow>
      </value>
      <value name="TO">
        <shadow type="math_number"><field name="NUM">10</field></shadow>
      </value>
      <value name="BY">
        <shadow type="math_number"><field name="NUM">1</field></shadow>
      </value>
    </block>
  </category>
  <category name="Operators" colour="#59C059">
    <block type="math_arithmetic"></block>
    <block type="logic_compare"></block>
    <block type="logic_operation"></block>
    <block type="logic_negate"></block>
    <block type="math_random_int">
         <value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
         <value name="TO"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
    </block>
  </category>
  <category name="Variables" colour="#FF8C1A" custom="VARIABLE"></category>
</xml>`;

export const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  advanced: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  default: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
};
