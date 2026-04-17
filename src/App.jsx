import React, { useState } from 'react';
import Tree from 'react-d3-tree';
import { 
  Play, BookOpen, Type, Info, ChevronRight, Hash, 
  AlignLeft, AlignRight, Zap, GraduationCap, LayoutDashboard,
  Code2, AlertCircle
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
          if (this.grammar.some(p => p.lhs === nextSymbol && p.rhs.length === 0)) {
             const newState = { ...state, dot: state.dot + 1, children: [...state.children, {lhs: nextSymbol, rhs:['ε'], dot:1, start:i, children:[]}]};
             if (!this.hasState(charts[i], newState)) charts[i].push(newState);
          }
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
      for (let i = current.length - 1; i >= 0; i--) { if (!current[i].isTerminal) { idx = i; break; } }
    }
    if (idx === -1) break;
    const next = [...current.slice(0, idx), ...current[idx].children, ...current.slice(idx + 1)];
    steps.push(next);
    max++;
  }
  return steps.map(s => s.map(n => n.name).filter(x => x !== 'ε').join('') || 'ε');
};


export default function App() {
  const [grammar, setGrammar] = useState("S → S a | b");
  const [input, setInput] = useState("baaa");
  const [tree, setTree] = useState(null);
  const [derivs, setDerivs] = useState({ l: [], r: [] });
  const [error, setError] = useState("");

  const run = () => {
    setError("");
    const parser = new EarleyParser(grammar);
    const result = parser.getTree(input);
    if (result) {
      setTree(result);
      setDerivs({ l: generateDerivations(result, 'left'), r: generateDerivations(result, 'right') });
    } else {
      setError("Rejected: Invalid string for this grammar.");
      setTree(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 font-sans">
      <aside className="w-64 bg-slate-900 text-white p-8 hidden lg:flex flex-col">
        <h1 className="text-2xl font-black mb-10 text-indigo-400 tracking-tighter italic">CFG PRO</h1>
        <nav className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 font-bold"><LayoutDashboard size={20}/> Visualizer</div>
          <div className="text-slate-500 flex items-center gap-2 px-1 text-sm"><Info size={16}/> Logic: Earley Parser</div>
        </nav>
      </aside>

      <main className="flex-1 p-6 lg:p-10 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
            <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Grammar Rules(Space Seperated)</label>
              <textarea className="w-full h-40 p-4 font-mono text-xs bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner" value={grammar} onChange={e => setGrammar(e.target.value)} />
              
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 mb-2">Input String</label>
              <input className="w-full p-4 font-mono text-xs bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner" value={input} onChange={e => setInput(e.target.value)} />
              
              <button onClick={run} className="w-full mt-6 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><Zap size={18} fill="currentColor"/> ANALYZE</button>
              {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-red-100 uppercase"><AlertCircle size={14}/> {error}</div>}
            </div>

            
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm h-[500px] relative overflow-hidden">
               <div className="absolute top-6 left-6 font-bold text-[10px] text-slate-400 uppercase tracking-widest z-10">Parse Tree</div>
               {tree ? <Tree data={tree} orientation="vertical" pathFunc="step" translate={{ x: 300, y: 50 }} /> : <div className="h-full flex items-center justify-center text-slate-300 italic">No structure generated.</div>}
            </div>
          </div>

         
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
            <DerivationView title="Leftmost" steps={derivs.l} icon={<AlignLeft size={16}/>} />
            <DerivationView title="Rightmost" steps={derivs.r} icon={<AlignRight size={16}/>} />
          </div>
        </div>
      </main>
    </div>
  );
}

function DerivationView({ title, steps, icon }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <h3 className="flex items-center gap-2 text-indigo-600 font-bold uppercase text-xs tracking-widest mb-4">{icon} {title}</h3>
      <div className="space-y-1">
        {steps.map((s, i) => (
          <div key={i} className="font-mono text-[11px] flex gap-2 p-2 bg-slate-50 rounded-lg">
            <span className="text-slate-300 w-4">{i}</span>
            <span className="text-indigo-400 font-bold italic">⇒</span>
            <span className="text-slate-600">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}