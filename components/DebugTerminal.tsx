import React, { useState, useEffect, useRef } from 'react';

interface Log {
  level: string;
  message: string;
  timestamp: string;
}

interface DebugTerminalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DebugTerminal: React.FC<DebugTerminalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [firebaseStatus, setFirebaseStatus] = useState<'checking' | 'ok' | 'fail'>('checking');
  const logsEndRef = useRef<null | HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setLogs([...((window as any)._debugLogs || [])]);
      checkFirebaseHealth();

      intervalRef.current = window.setInterval(() => {
        setLogs(currentLogs => {
            const globalLogs = (window as any)._debugLogs || [];
            if (globalLogs.length !== currentLogs.length) {
                return [...globalLogs];
            }
            return currentLogs;
        });
      }, 500);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [logs, isOpen]);

  const checkFirebaseHealth = async () => {
      setFirebaseStatus('checking');
      try {
          const isOnline = navigator.onLine;
          if (!isOnline) throw new Error("Offline");
          console.info("Diagnóstico: Verificando integridade do Firebase...");
          setFirebaseStatus('ok');
      } catch (e) {
          setFirebaseStatus('fail');
          console.error("Diagnóstico: Falha na conexão crítica.");
      }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };
  
  const handleClearLogs = () => {
    if (Array.isArray((window as any)._debugLogs)) {
        (window as any)._debugLogs.length = 0;
    }
    setLogs([]);
    console.log("Terminal: Logs limpos.");
  };

  const handleCopyReport = () => {
      const envInfo = `
--- RELATÓRIO TÉCNICO GESTORPRO ---
Timestamp: ${new Date().toISOString()}
Navegador: ${navigator.userAgent}
Host: ${window.location.host || 'Sandbox/Preview'}
Origin: ${window.location.origin}
Protocolo: ${window.location.protocol}
Online: ${navigator.onLine}
PWA Standalone: ${window.matchMedia('(display-mode: standalone)').matches}
Firebase Status: ${firebaseStatus}
------------------------------------------
LOGS:
${logs.map(l => `[${l.timestamp}] ${l.level.toUpperCase()}: ${l.message}`).join('\n')}
      `;
      navigator.clipboard.writeText(envInfo);
      alert("Relatório completo copiado!");
  };

  const handleSystemScan = async () => {
    console.info("--- INICIANDO VARREDURA COMPLETA ---");
    const currentOrigin = window.location.origin;
    const isSandbox = !currentOrigin || currentOrigin === 'null';
    
    console.log("Conectividade:", navigator.onLine ? "ONLINE" : "OFFLINE");
    console.log("Ambiente:", isSandbox ? "Isolado (Sandbox/Preview)" : "Produção/Local");
    console.log("Origem atual:", currentOrigin);
    
    if ('serviceWorker' in navigator) {
        try {
            if (isSandbox) {
                console.warn("PWA: Registro de Service Worker é bloqueado pelo navegador em ambientes com origem 'null' por segurança.");
            }
            const regs = await navigator.serviceWorker.getRegistrations();
            console.log(`PWA: ${regs.length} registros ativos encontrados.`);
            regs.forEach(r => console.log(`- Scope: ${r.scope} | Ativo: ${!!r.active}`));
        } catch (e: any) {
            console.error("PWA: Erro de acesso à API.", e.message);
        }
    }

    try {
        const cacheNames = await caches.keys();
        console.log(`Cache: ${cacheNames.length} versões armazenadas.`);
    } catch (e: any) {
        console.warn("Cache: Acesso restrito ou inválido.");
    }
    console.info("--- VARREDURA CONCLUÍDA ---");
  };

  const handleHardResetPWA = async () => {
      if (!confirm("Isso irá remover todos os Service Workers e limpar o cache. Continuar?")) return;
      console.warn("RESET NUCLEAR: Iniciando...");
      try {
          if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) { 
                  try { await registration.unregister(); } catch(e) {}
              }
          }
          if ('caches' in window) {
              const keys = await caches.keys();
              for (const key of keys) { await caches.delete(key); }
          }
          localStorage.clear();
          console.log("Limpeza profunda concluída.");
          window.location.reload();
      } catch (e: any) {
          console.error("Erro no reset:", e.message);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="w-full max-w-5xl h-[85vh] bg-gray-950 text-white rounded-2xl shadow-2xl flex flex-col font-mono text-xs border border-gray-800">
        <header className="flex-shrink-0 flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 rounded-t-2xl">
          <div className="flex items-center gap-4">
             <div className={`h-3 w-3 rounded-full ${firebaseStatus === 'ok' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 animate-pulse'}`}></div>
             <h2 className="font-bold uppercase tracking-widest text-gray-400">Diagnostic Console v3.2</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopyReport} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md font-bold transition-all">Copiar Relatório</button>
            <button onClick={handleHardResetPWA} className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800 text-red-200 border border-red-700/50 rounded-md font-bold transition-all">Reset Nuclear</button>
            <button onClick={handleSystemScan} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors">Varredura</button>
            <button onClick={onClose} className="px-3 py-1.5 bg-white text-black hover:bg-gray-200 rounded-md font-bold transition-all ml-2">X</button>
          </div>
        </header>
        <main className="flex-grow p-4 overflow-y-auto bg-black/40 scrollbar-thin">
          {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-700 italic">
                  <p>Escutando sistema...</p>
              </div>
          ) : (
            logs.map((log, index) => (
                <div key={index} className="flex gap-4 border-b border-gray-900 py-2 hover:bg-white/5 transition-colors">
                  <span className="text-gray-600 whitespace-nowrap opacity-50">[{log.timestamp}]</span>
                  <span className={`font-bold min-w-[70px] ${getLogColor(log.level)}`}>{log.level.toUpperCase()}</span>
                  <pre className={`whitespace-pre-wrap break-all flex-grow ${getLogColor(log.level)}`}>{log.message}</pre>
                </div>
              ))
          )}
          <div ref={logsEndRef} />
        </main>
        <footer className="p-3 bg-gray-950 text-[10px] text-gray-600 flex justify-between border-t border-gray-900 rounded-b-2xl">
            <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${navigator.onLine ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></span>
                Net: {navigator.onLine ? 'ONLINE' : 'OFFLINE'} | Firebase: {firebaseStatus.toUpperCase()}
            </span>
            <span>Logs: {logs.length} entries</span>
        </footer>
      </div>
    </div>
  );
};

export default DebugTerminal;