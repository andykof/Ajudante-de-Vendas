import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Copy, RefreshCw, User, Briefcase, Calculator, Building, MapPin, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Stage = 
  | 'Não Definida'
  | 'Abordagem'
  | 'Qualificação'
  | 'Encantamento'
  | 'Oferta'
  | 'Quebra de Objeções'
  | 'Fechamento'
  | 'Pós-vendas';

const STAGES: Stage[] = [
  'Não Definida',
  'Abordagem',
  'Qualificação',
  'Encantamento',
  'Oferta',
  'Quebra de Objeções',
  'Fechamento',
  'Pós-vendas'
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  stage?: Stage;
}

export default function Copilot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [clientName, setClientName] = useState('');
  const [currentStage, setCurrentStage] = useState<Stage>('Não Definida');
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          setServerStatus('online');
        } else {
          setServerStatus('offline');
        }
      } catch (error) {
        setServerStatus('offline');
      }
    };
    checkHealth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isLoading) return;

    const userMsg = inputVal.trim();
    setInputVal('');
    
    // Build context from previous messages (to give AI memory)
    const contextLimit = 4;
    const recentMessages = messages.slice(-contextLimit).map(m => 
      `${m.role === 'user' ? 'Corretor (informando a fala do cliente)' : 'Ship It Apps'}: ${m.content}`
    ).join('\n---\n');

    setMessages(prev => [...prev, { role: 'user', content: userMsg, stage: currentStage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientMessage: userMsg,
          stage: currentStage !== 'Não Definida' ? currentStage : undefined,
          currentContext: recentMessages,
          clientName: clientName.trim()
        }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        throw new Error("O servidor retornou uma resposta inválida (não-JSON). Isso geralmente significa que o backend Node.js não está rodando corretamente na sua hospedagem e está retornando a página HTML principal em vez da API.");
      }

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Falha ao analisar a mensagem');

      setMessages(prev => [...prev, { role: 'assistant', content: data.result }]);
      
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: `**Erro ao processar a requisição.**\n\nDetalhes: ${error instanceof Error ? error.message : String(error)}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    // Attempt to extract just the B2C script to copy, otherwise copy all
    const scriptRegex = /### \[SCRIPT B2C PARA COPIAR\]\s*([\s\S]*?)($)/i;
    const match = text.match(scriptRegex);
    const textToCopy = match ? match[1].trim() : text;
    
    navigator.clipboard.writeText(textToCopy);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-900 font-sans">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-600 rounded-sm flex items-center justify-center text-white font-black italic">S</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Ship It <span className="text-orange-600 italic">Apps</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Co-Piloto Conectado</p>
            <p className="text-sm font-semibold text-slate-700">Anderson - Grupo Kallas</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-orange-500 overflow-hidden">
            <div className="w-full h-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold">A.K</div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-5xl w-full mx-auto p-4 md:p-6 gap-6">
        
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mb-4 text-orange-600 font-bold italic text-2xl">S</div>
              <h2 className="text-xl font-bold tracking-tight mb-2 text-slate-800">Pronto para vender?</h2>
              <p className="max-w-md text-sm leading-relaxed">
                Insira o contexto do lead ou a última mensagem do cliente. Analisarei as informações e estruturarei a melhor abordagem com um script persuasivo pronto para envio. Adicione o nome do cliente para respostas personalizadas.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-2",
                  msg.role === 'user' ? "self-end items-end" : "self-start items-start"
                )}
              >
                {/* Avatar & Meta */}
                <div className={cn("flex items-center gap-2 mb-1.5 px-1", msg.role === 'user' && "flex-row-reverse")}>
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                    msg.role === 'user' ? "bg-slate-300 text-white" : "bg-orange-100 text-orange-600"
                  )}>
                    {msg.role === 'user' ? <span className="font-bold text-[10px]">A.K</span> : <span className="font-black italic text-[10px]">S</span>}
                  </div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {msg.role === 'user' ? 'Você' : 'Ship It AI'}
                  </span>
                  {msg.stage && msg.stage !== 'Não Definida' && (
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 px-2">
                       • {msg.stage}
                    </span>
                  )}
                </div>

                {/* Bubble */}
                <div 
                  className={cn(
                    "rounded-2xl px-5 py-4 shadow-sm text-[15px] leading-relaxed relative group",
                    msg.role === 'user' 
                      ? "bg-white border-l-4 border-orange-500 text-slate-800 rounded-tr-sm" 
                      : "bg-white border border-slate-200 rounded-tl-sm text-slate-800 w-full markdown-body"
                  )}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="max-w-none">
                      <ReactMarkdown components={{
                        h3: ({node, ...props}) => (
                           <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0">
                             <div className="w-2 h-6 bg-slate-800 rounded-full"></div>
                             <h3 className="font-bold text-sm tracking-widest uppercase text-slate-800 m-0 p-0 border-0" {...props} />
                           </div>
                        ),
                        strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />
                      }}>
                        {msg.content}
                      </ReactMarkdown>
                      
                      <button 
                        onClick={() => handleCopy(msg.content)}
                        className="absolute -right-3 -bottom-3 bg-slate-800 border-none text-white p-2 rounded-full shadow-lg hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Copiar Script B2C"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="self-start flex flex-col items-start max-w-[85%] animate-in fade-in">
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black italic text-[10px]">
                  S
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ship It AI</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-3 w-48">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 shrink-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
               <div className="flex items-center gap-3">
                 <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide shrink-0">
                  Nome do Cliente:
                 </label>
                 <input
                   type="text"
                   value={clientName}
                   onChange={(e) => setClientName(e.target.value)}
                   placeholder="Ex: João"
                   className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium sm:w-40"
                 />
               </div>
               <div className="flex items-center gap-3">
                 <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide shrink-0">
                  Fase do Atendimento:
                 </label>
                 <select 
                    value={currentStage} 
                    onChange={(e) => setCurrentStage(e.target.value as Stage)}
                    className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                 >
                   {STAGES.map(s => (
                     <option key={s} value={s}>{s}</option>
                   ))}
                 </select>
               </div>
            </div>
            <div className="flex gap-3 relative mt-1">
              <textarea
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Como o lead chegou ou cole a resposta do cliente aqui..."
                className="w-full resize-none border border-slate-200 rounded-xl px-4 py-3 min-h-[60px] max-h-32 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-slate-50"
                rows={2}
              />
              <button 
                type="submit" 
                disabled={!inputVal.trim() || isLoading}
                className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl px-6 py-3 flex items-center justify-center transition-all shadow-lg active:scale-95 shrink-0 uppercase tracking-widest text-sm"
              >
                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <span>Enviar</span>}
              </button>
            </div>
            <div className="text-[10px] text-slate-400 text-center font-medium">
              Aperte <kbd className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200 mx-0.5">Enter</kbd> para enviar
            </div>
          </form>
        </div>

      </main>

      {/* Footer Status */}
      <footer className="h-10 bg-slate-800 flex items-center px-4 md:px-8 text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            serverStatus === 'online' ? "bg-green-400 cursor-help" : 
            serverStatus === 'offline' ? "bg-red-500 cursor-help" : 
            "bg-yellow-400 animate-pulse"
          )} title={serverStatus === 'offline' ? 'Erro: Falha ao acessar a API do servidor Node.js' : 'Sistema Online'}></div>
          <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">
            {serverStatus === 'online' ? "IA Conectada • Analisando fluxo Kazzas/Verus" : 
             serverStatus === 'offline' ? "Erro • Backend Desconectado" : 
             "Conectando ao Servidor..."}
          </span>
        </div>
        <div className="ml-auto text-[10px] font-bold opacity-50 uppercase tracking-widest hidden sm:block">
          Sinal padrão 6% aplicado • RAG v2.4
        </div>
      </footer>
    </div>
  );
}
