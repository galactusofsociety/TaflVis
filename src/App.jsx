import React, { useState } from 'react';
import Tree from 'react-d3-tree';
import { 
  Play, Terminal, Layers, GraduationCap, GitBranch, BookOpenText
} from 'lucide-react';

class EarleyParser {
  constructor(grammarText) {
    this.grammar = [];
    this.nonTerminals = new Set();
    this.parse(grammarText);
  }

  parse(text) {
    const lines = text.split('\n').filter(l => l.includes('->') || l.includes('→'));
    lines.forEach(line => {
      const [lhs, rhsPart] = line.split(/[→-]>|→/).map(s => s.trim());
      this.nonTerminals.add(lhs);
      rhsPart.split('|').forEach(prod => {
        const tokens = prod.trim() === 'ε' || prod.trim() === 'e' || prod.trim() === '' 
          ? [] 
          : prod.trim().split(/\s+/).flatMap(t => t.split('')); 
        this.grammar.push({ lhs, rhs: tokens });
      });
    });
    this.startSymbol = this.grammar[0]?.lhs;
  }

  getTree(inputString) {
    const tokens = inputString.replace(/\s+/g, '').split('');
    if (!this.startSymbol) return null;

    const charts = Array.from({ length: tokens.length + 1 }, () => []);
    this.grammar.filter(p => p.lhs === this.startSymbol).forEach(p => {
      charts[0].push({ lhs: p.lhs, rhs: p.rhs, dot: 0, start: 0, children: [] });
    });

    for (let i = 0; i <= tokens.length; i++) {
      let j = 0;
      while (j < charts[i].length) {
        const state = charts[i][j];
        const nextSymbol = state.rhs[state.dot];

        if (nextSymbol === undefined) {
          charts[state.start].forEach(s => {
            if (s.rhs[s.dot] === state.lhs) {
              const newState = { ...s, dot: s.dot + 1, children: [...s.children, state] };
              if (!this.hasState(charts[i], newState)) charts[i].push(newState);
            }
          });
        } else if (this.nonTerminals.has(nextSymbol)) {
          this.grammar.filter(p => p.lhs === nextSymbol).forEach(p => {
            const newState = { lhs: p.lhs, rhs: p.rhs, dot: 0, start: i, children: [] };
            if (!this.hasState(charts[i], newState)) charts[i].push(newState);
          });
        } else {
          if (i < tokens.length && nextSymbol === tokens[i]) {
            const newState = { ...state, dot: state.dot + 1, children: [...state.children, { name: nextSymbol, isTerminal: true }] };
            if (!this.hasState(charts[i + 1], newState)) charts[i + 1].push(newState);
          }
        }
        j++;
      }
    }

    const success = charts[tokens.length].find(s => s.lhs === this.startSymbol && s.dot === s.rhs.length && s.start === 0);
    return success ? this.simplify(success) : null;
  }

  hasState(chart, state) {
    return chart.some(s => s.lhs === state.lhs && s.dot === state.dot && s.start === state.start && s.rhs.join('') === state.rhs.join(''));
  }

  simplify(state) {
    if (state.isTerminal) return { name: state.name, isTerminal: true, children: [] };
    return {
      name: state.lhs,
      isTerminal: false,
      children: state.children.map(c => this.simplify(c))
    };
  }
}

const generateDerivations = (root, mode = 'left') => {
  if (!root) return [];
  let steps = [[root]];
  let max = 0;
  while (max < 50) {
    let current = steps[steps.length - 1];
    let idx = mode === 'left' ? current.findIndex(n => !n.isTerminal) : -1;
    if (mode === 'right') {
      for (let i = current.length - 1; i >= 0; i--) {
        if (!current[i].isTerminal) { idx = i; break; }
      }
    }
    if (idx === -1) break;
    const next = [...current.slice(0, idx), ...current[idx].children, ...current.slice(idx + 1)];
    steps.push(next);
    max++;
  }
  return steps.map(s => s.map(n => n.name).filter(x => x !== 'ε').join('') || 'ε');
};



const Visualizer = () => {
  const [grammar, setGrammar] = useState("S → S a | b");
  const [input, setInput] = useState("baaa");
  const [tree, setTree] = useState(null);
  const [derivs, setDerivs] = useState({ l: [], r: [] });

  const run = () => {
    const parser = new EarleyParser(grammar);
    const res = parser.getTree(input);
    if (res) {
      setTree(res);
      setDerivs({
        l: generateDerivations(res, 'left'),
        r: generateDerivations(res, 'right')
      });
    } else {
      setTree(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-slate-900 p-6 rounded-2xl space-y-4">
        <h2 className="text-cyan-400 font-bold flex gap-2"><Terminal/> CFG Input</h2>
        <textarea value={grammar} onChange={e=>setGrammar(e.target.value)} className="w-full h-40 bg-black p-3 rounded"/>
        <input value={input} onChange={e=>setInput(e.target.value)} className="w-full bg-black p-3 rounded"/>
        <button onClick={run} className="w-full bg-cyan-500 py-3 rounded flex justify-center gap-2">
          <Play/> Generate Tree
        </button>
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl p-4">
        {tree ? (
          <Tree data={tree} orientation="vertical" translate={{x:300,y:50}}/>
        ) : (
          <div className="h-96 flex items-center justify-center text-slate-500">No Tree</div>
        )}
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-cyan-400 font-bold text-sm uppercase tracking-wider">Left Derivation</h3>
    <span className="text-xs text-slate-500">Steps: {derivs.l.length}</span>
  </div>
  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
    {derivs.l.map((s,i)=>(
      <div key={i} className="flex items-center gap-3 bg-black/40 border border-slate-700 rounded-xl px-3 py-2 hover:border-cyan-500/40 transition">
        <span className="text-xs font-bold text-slate-500 w-5">{i}</span>
        <span className="text-cyan-500">⇒</span>
        <span className="font-mono text-sm tracking-wide text-white">
          {s.split('').map((ch,ci)=>(
            <span key={ci} className={/[A-Z]/.test(ch)?'text-cyan-400 font-bold':''}>{ch}</span>
          ))}
        </span>
      </div>
    ))}
  </div>
</div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-cyan-400 font-bold text-sm uppercase tracking-wider">Right Derivation</h3>
    <span className="text-xs text-slate-500">Steps: {derivs.r.length}</span>
  </div>
  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
    {derivs.r.map((s,i)=>(
      <div key={i} className="flex items-center gap-3 bg-black/40 border border-slate-700 rounded-xl px-3 py-2 hover:border-cyan-500/40 transition">
        <span className="text-xs font-bold text-slate-500 w-5">{i}</span>
        <span className="text-cyan-500">⇒</span>
        <span className="font-mono text-sm tracking-wide text-white">
          {s.split('').map((ch,ci)=>(
            <span key={ci} className={/[A-Z]/.test(ch)?'text-cyan-400 font-bold':''}>{ch}</span>
          ))}
        </span>
      </div>
    ))}
  </div>
</div>
    </div>
  );
};


const Learning = () => (
  <div className="max-w-6xl mx-auto space-y-12">

    <div>
      <h1 className="text-5xl font-bold text-cyan-400 mb-4">CFG → Parse Tree Guide</h1>
      <p className="text-slate-400 max-w-2xl text-sm leading-relaxed">
        This section helps you actually understand what your visualizer is doing under the hood — not just definitions, but how everything connects: grammar → derivation → parse tree → parsing algorithm.
      </p>
    </div>

   
    <div className="grid md:grid-cols-2 gap-6">

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-bold mb-3 text-cyan-400">1. Context-Free Grammar (CFG)</h2>
        <ul className="text-slate-400 text-sm space-y-2">
          <li>• A CFG is defined as: (V, Σ, R, S)</li>
          <li>• V → Non-terminals (variables)</li>
          <li>• Σ → Terminals (actual symbols)</li>
          <li>• R → Production rules</li>
          <li>• S → Start symbol</li>
        </ul>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-bold mb-3 text-cyan-400">2. Parse Tree</h2>
        <ul className="text-slate-400 text-sm space-y-2">
          <li>• Root = Start symbol</li>
          <li>• Internal nodes = Non-terminals</li>
          <li>• Leaves = Terminals</li>
          <li>• Shows how a string is generated structurally</li>
        </ul>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-bold mb-3 text-cyan-400">3. Derivations</h2>
        <ul className="text-slate-400 text-sm space-y-2">
          <li>• Leftmost: expand leftmost non-terminal first</li>
          <li>• Rightmost: expand rightmost non-terminal first</li>
          <li>• Both produce same string, but different steps</li>
        </ul>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-bold mb-3 text-cyan-400">4. Ambiguity</h2>
        <ul className="text-slate-400 text-sm space-y-2">
          <li>• A grammar is ambiguous if multiple parse trees exist</li>
          <li>• Same string → different structures</li>
          <li>• Common in arithmetic expressions</li>
        </ul>
      </div>

    </div>

   
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
      <h2 className="text-xl font-bold mb-3 text-cyan-400">Earley Parsing (What  tool uses)</h2>
      <p className="text-slate-400 text-sm leading-relaxed mb-4">
        The Earley parser is a powerful parsing algorithm that can handle all context-free grammars — even left-recursive ones.
      </p>

      <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-400">
        <div className="bg-black/40 p-4 rounded-xl border border-slate-700">
          <h3 className="font-bold text-white mb-1">Predictor</h3>
          Adds possible productions for a non-terminal.
        </div>

        <div className="bg-black/40 p-4 rounded-xl border border-slate-700">
          <h3 className="font-bold text-white mb-1">Scanner</h3>
          Matches terminals with input string.
        </div>

        <div className="bg-black/40 p-4 rounded-xl border border-slate-700">
          <h3 className="font-bold text-white mb-1">Completer</h3>
          Moves forward when a rule is fully matched.
        </div>
      </div>
    </div>

   
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
      <h2 className="text-xl font-bold mb-3 text-cyan-400">Worked Example</h2>
      <pre className="bg-black p-4 rounded text-cyan-400 text-sm">
S → S a | b
Input: baaa
      </pre>

      <p className="text-slate-400 text-sm mt-4">
        The grammar is left-recursive. A simple parser would fail, but Earley handles it.
        The parse tree grows by repeatedly expanding S → S a until reaching base case S → b.
      </p>
    </div>


    <div className="bg-gradient-to-r from-cyan-500/10 to-transparent p-6 rounded-2xl border border-cyan-500/20">
      <h2 className="text-lg font-bold text-cyan-400 mb-2">Practical Tips</h2>
      <ul className="text-slate-300 text-sm space-y-2">
        <li>• If your string is rejected → check grammar completeness</li>
        <li>• Use ε carefully (empty productions)</li>
        <li>• Try ambiguous grammars to test multiple interpretations</li>
        <li>• Keep non-terminals uppercase for clarity</li>
      </ul>
    </div>

  </div>
);

export default function App(){
  const [tab,setTab]=useState('home');

  return (
    <div className="min-h-screen bg-black text-white">

      {tab==='home' && (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 animate-in fade-in duration-700">
          <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-6">
            CFG <span className="text-cyan-400">Parse Tree</span>
          </h1>

          <p className="max-w-xl text-slate-400 mb-10 text-sm leading-relaxed">
            Visualize how Context-Free Grammars generate strings using parse trees and derivations.
            Built with an Earley parser to support even complex and left-recursive grammars.
          </p>

          <div className="flex gap-6">
            <button 
              onClick={()=>setTab('viz')} 
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-2xl shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95"
            >
              Open Visualizer
            </button>

            <button 
              onClick={()=>setTab('learn')} 
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 font-bold rounded-2xl transition-all hover:scale-105 active:scale-95"
            >
              Learn Concepts
            </button>
          </div>

          <div className="mt-20 grid md:grid-cols-3 gap-6 max-w-4xl">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition">
              <h3 className="font-bold mb-2 text-cyan-400">Any CFG</h3>
              <p className="text-slate-400 text-sm">Supports left recursion and complex productions.</p>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition">
              <h3 className="font-bold mb-2 text-cyan-400">Parse Tree</h3>
              <p className="text-slate-400 text-sm">Instant visual structure of derivation.</p>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition">
              <h3 className="font-bold mb-2 text-cyan-400">Derivations</h3>
              <p className="text-slate-400 text-sm">Leftmost & rightmost sequences generated.</p>
            </div>
          </div>
        </div>
      )}

      {tab!=='home' && (
        <div className="p-6">
          <div className="flex gap-4 mb-6">
            <button onClick={()=>setTab('home')} className="px-4 py-2 bg-slate-800 rounded">Home</button>
            <button onClick={()=>setTab('viz')} className="px-4 py-2 bg-cyan-500 rounded">Visualizer</button>
            <button onClick={()=>setTab('learn')} className="px-4 py-2 bg-slate-800 rounded">Learn</button>
          </div>

          {tab==='viz'?<Visualizer/>:<Learning/>}
        </div>
      )}
    </div>
  );
}
