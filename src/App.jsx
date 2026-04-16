import React, { useState, useCallback } from 'react';
import Tree from 'react-d3-tree';
import { Play, BookOpen, Type, Info, ChevronRight, Hash, AlignLeft, AlignRight } from 'lucide-react';


const parseRules = (text) => {
  const grammar = {};
  text.split('\n').filter(line => line.trim()).forEach(line => {
    const [lhs, rhs] = line.split('->').map(s => s.trim());
    if (lhs && rhs) {
      grammar[lhs] = rhs.split('|').map(p => p.trim().split(/\s+/));
    }
  });
  return grammar;
};

const buildParseTree = (grammar, symbol, tokens, index = 0, depth = 0) => {
  if (depth > 15) return null; 
  if (!grammar[symbol]) {
    if (tokens[index] === symbol) {
      return { node: { name: symbol, children: [] }, nextIndex: index + 1 };
    }
    return null;
  }

  for (let production of grammar[symbol]) {
    let currentIndex = index;
    let children = [];
    let possible = true;
    for (let part of production) {
      const result = buildParseTree(grammar, part, tokens, currentIndex, depth + 1);
      if (result) {
        children.push(result.node);
        currentIndex = result.nextIndex;
      } else {
        possible = false;
        break;
      }
    }
    if (possible) return { node: { name: symbol, children }, nextIndex: currentIndex };
  }
  return null;
};


const generateDerivationSteps = (node, mode = 'left') => {
  const steps = [];
  
  const resolve = (currentNodes) => {
    steps.push(currentNodes.map(n => n.name).join(' '));
    
    let targetIdx = -1;

    if (mode === 'left') {
     
      targetIdx = currentNodes.findIndex(n => n.children && n.children.length > 0);
    } else {
    
      for (let i = currentNodes.length - 1; i >= 0; i--) {
        if (currentNodes[i].children && currentNodes[i].children.length > 0) {
          targetIdx = i;
          break;
        }
      }
    }

    if (targetIdx !== -1) {
      const target = currentNodes[targetIdx];
      const newNodes = [
        ...currentNodes.slice(0, targetIdx),
        ...target.children,
        ...currentNodes.slice(targetIdx + 1)
      ];
      resolve(newNodes);
    }
  };

  if (node) resolve([node]);
  return steps;
};


export default function App() {
  const [grammarText, setGrammarText] = useState("S -> A B\nA -> a\nB -> b");
  const [inputString, setInputString] = useState("ab");
  const [treeData, setTreeData] = useState(null);
  const [lmdSteps, setLmdSteps] = useState([]);
  const [rmdSteps, setRmdSteps] = useState([]);
  const [error, setError] = useState("");

  const handleProcess = useCallback(() => {
    setError("");
    try {
      const grammar = parseRules(grammarText);
      const startSymbol = Object.keys(grammar)[0];
      const tokens = inputString.split('');
      const result = buildParseTree(grammar, startSymbol, tokens);

      if (result && result.nextIndex === tokens.length) {
        setTreeData(result.node);
        setLmdSteps(generateDerivationSteps(result.node, 'left'));
        setRmdSteps(generateDerivationSteps(result.node, 'right'));
      } else {
        setError("Derivation failed. The string doesn't match the grammar.");
        setTreeData(null);
        setLmdSteps([]);
        setRmdSteps([]);
      }
    } catch (e) {
      setError("Input Error: Formatting issues.");
    }
  }, [grammarText, inputString]);

  const DerivationList = ({ title, steps, icon: Icon }) => (
    <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-4 text-indigo-600">
        <Icon size={18} />
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">{title}</h3>
      </div>
      <div className="space-y-2">
        {steps.length > 0 ? steps.map((step, i) => (
          <div key={i} className="font-mono text-sm flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100">
             <span className="text-slate-400 text-[10px] w-4">{i + 1}</span>
             <span className="text-indigo-400"> {i > 0 && "⇒"}</span>
             <div className="flex gap-1">
               {step.split(' ').map((s, idx) => (
                 <span key={idx} className={/[A-Z]/.test(s) ? "text-indigo-600 font-bold" : "text-slate-500"}>{s}</span>
               ))}
             </div>
          </div>
        )) : <p className="text-slate-400 italic text-sm">No data available</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-8 flex justify-between items-end border-b pb-6 border-slate-200">
          <div>
            <h1 className="text-3xl font-black text-indigo-600 flex items-center gap-2">
              <Hash className="text-indigo-400" /> CFG Visualizer
            </h1>
            <p className="text-slate-500 font-medium">Leftmost vs Rightmost Derivation Analysis</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <label className="flex items-center gap-2 text-slate-700 font-bold mb-4">
                <BookOpen size={18} className="text-indigo-500" /> Grammar Rules
              </label>
              <textarea
                className="w-full h-40 p-4 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={grammarText}
                onChange={(e) => setGrammarText(e.target.value)}
              />
              
              <label className="flex items-center gap-2 text-slate-700 font-bold mt-6 mb-4">
                <Type size={18} className="text-indigo-500" /> Input String
              </label>
              <input
                type="text"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                value={inputString}
                onChange={(e) => setInputString(e.target.value)}
              />

              <button
                onClick={handleProcess}
                className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100"
              >
                <Play size={16} fill="currentColor" /> Generate Visuals
              </button>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-start gap-2 border border-red-100 italic">
                  <Info size={14} className="shrink-0 mt-0.5" /> {error}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {/* Tree View */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Graphical Parse Tree</h3>
              </div>
              <div className="h-[400px] w-full relative bg-white">
                {treeData ? (
                  <Tree 
                    data={treeData} 
                    orientation="vertical"
                    translate={{ x: 300, y: 40 }}
                    pathFunc="step"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300">
                    <ChevronRight size={48} className="opacity-10" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <DerivationList title="Leftmost" steps={lmdSteps} icon={AlignLeft} />
              <DerivationList title="Rightmost" steps={rmdSteps} icon={AlignRight} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}