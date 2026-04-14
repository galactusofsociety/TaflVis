import React, { useState, useCallback } from 'react';
import Tree from 'react-d3-tree';
import { Play, BookOpen, Type, Info, ChevronRight, Hash } from 'lucide-react';


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

    if (possible) {
      return { node: { name: symbol, children }, nextIndex: currentIndex };
    }
  }
  return null;
};


const generateDerivations = (node) => {
  const steps = [];
  const resolve = (currentNodes) => {
    steps.push(currentNodes.map(n => n.name).join(' '));
    
    const idx = currentNodes.findIndex(n => n.children && n.children.length > 0);
    if (idx !== -1) {
      const target = currentNodes[idx];
      const newNodes = [
        ...currentNodes.slice(0, idx),
        ...target.children,
        ...currentNodes.slice(idx + 1)
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
  const [derivations, setDerivations] = useState([]);
  const [error, setError] = useState("");

  const handleProcess = useCallback(() => {
    setError("");
    try {
      const grammar = parseRules(grammarText);
      const startSymbol = Object.keys(grammar)[0];
      if (!startSymbol) throw new Error("No rules found");
      
      const tokens = inputString.split('');
      const result = buildParseTree(grammar, startSymbol, tokens);

      if (result && result.nextIndex === tokens.length) {
        setTreeData(result.node);
        setDerivations(generateDerivations(result.node));
      } else {
        setError("The string '" + inputString + "' cannot be derived with these rules.");
        setTreeData(null);
        setDerivations([]);
      }
    } catch (e) {
      setError("Input Error: Ensure grammar follows 'S -> a B' format.");
    }
  }, [grammarText, inputString]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
     
        <header className="mb-8 border-b pb-6 border-slate-200">
          <h1 className="text-3xl font-black text-indigo-600 flex items-center gap-2">
            <Hash className="text-indigo-400" /> CFG Visualizer
          </h1>
          <p className="text-slate-500 font-medium">Context-Free Grammar Parse Tree & Derivation Generator</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
        
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold">
                <BookOpen size={18} className="text-indigo-500" />
                <h2>Grammar (LHS - RHS)</h2>
              </div>
              <textarea
                className="w-full h-48 p-4 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={grammarText}
                onChange={(e) => setGrammarText(e.target.value)}
                placeholder="S -> a B | b"
              />
              
              <div className="flex items-center gap-2 mt-6 mb-4 text-slate-700 font-bold">
                <Type size={18} className="text-indigo-500" />
                <h2>Input String</h2>
              </div>
              <input
                type="text"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                value={inputString}
                onChange={(e) => setInputString(e.target.value)}
                placeholder="e.g., ab"
              />

              <button
                onClick={handleProcess}
                className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100"
              >
                <Play size={16} fill="currentColor" /> Generate Parse
              </button>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-start gap-2 border border-red-100 italic">
                  <Info size={14} className="shrink-0 mt-0.5" /> {error}
                </div>
              )}
            </div>
          </div>

         
          <div className="lg:col-span-8 space-y-6">
            
           
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Parse Tree Visualization</h3>
              </div>
              <div className="h-[450px] w-full relative">
                {treeData ? (
                  <Tree 
                    data={treeData} 
                    orientation="vertical"
                    translate={{ x: 300, y: 50 }}
                    pathFunc="step"
                    collapsible={false}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300">
                    <ChevronRight size={48} className="opacity-20 mb-2" />
                    <p className="text-sm">Pending Input...</p>
                  </div>
                )}
              </div>
            </div>

          
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-4">Leftmost Derivation Sequence</h3>
              <div className="space-y-3">
                {derivations.length > 0 ? (
                  derivations.map((step, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <span className="text-slate-300 text-[10px] font-mono">{i + 1}</span>
                      <div className="font-mono text-sm px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 group-hover:border-indigo-200 transition-colors">
                        {i > 0 && <span className="text-indigo-400 mr-2">⇒</span>}
                        {step.split(' ').map((sym, si) => (
                          <span key={si} className={/[A-Z]/.test(sym) ? "text-indigo-600 font-bold" : "text-slate-600"}>
                            {sym}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic text-sm">Derivation steps will appear here.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}