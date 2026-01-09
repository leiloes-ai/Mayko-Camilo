import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AppProvider } from './contexts/AppContext.tsx';

// --- Global Debug Logger (Versão Ultra-Safe) ---
(window as any)._debugLogs = [];
const _originalConsole = { ...console };
const _logLevels: (keyof Console)[] = ['log', 'warn', 'error', 'info', 'debug'];

/**
 * Serializador seguro que lida com estruturas circulares e objetos complexos do Firebase
 */
const safeStringify = (obj: any, indent = 2): string => {
    const cache = new WeakSet();
    const ret = JSON.stringify(
        obj,
        (key, value) => {
            if (typeof value === 'object' && value !== null) {
                // Evita circularidade
                if (cache.has(value)) {
                    return '[Circular]';
                }
                cache.add(value);

                // Evita serializar objetos massivos ou internos conhecidos
                const constructorName = value.constructor?.name;
                if (
                    value instanceof HTMLElement || 
                    value instanceof Window || 
                    value instanceof Document ||
                    (constructorName && (
                        constructorName.startsWith('Firestore') || 
                        constructorName.startsWith('Firebase') ||
                        ['dr', 'Et', 'jt', 'Ot'].includes(constructorName) // Ofuscados do Firebase
                    ))
                ) {
                    return `[Object ${constructorName || 'Complex'}]`;
                }
            }
            return value;
        },
        indent
    );
    return ret;
};

const pushToLog = (level: string, message: string) => {
    try {
        const logs = (window as any)._debugLogs;
        if (logs.length > 500) logs.shift();
        logs.push({
            level,
            message: message.substring(0, 5000), // Limite de tamanho por entrada
            timestamp: new Date().toLocaleTimeString()
        });
    } catch (e) {
        _originalConsole.error("Falha ao empurrar log:", e);
    }
};

_logLevels.forEach(level => {
  const originalMethod = _originalConsole[level];
  if (typeof originalMethod === 'function') {
    (console as any)[level] = (...args: any[]) => {
      // Sempre executa o console original primeiro
      originalMethod.apply(console, args);
      
      try {
        const messageParts = args.map(arg => {
          if (arg instanceof Error) return `Error: ${arg.message}\n${arg.stack}`;
          if (typeof arg === 'string') return arg;
          if (typeof arg === 'undefined') return 'undefined';
          if (arg === null) return 'null';
          if (typeof arg !== 'object') return String(arg);
          
          try {
            return safeStringify(arg);
          } catch (e) {
            return `[Unserializable ${typeof arg}]`;
          }
        });
        
        pushToLog(level, messageParts.join(' '));
      } catch (e) {
        // Silencioso para não entrar em loop infinito se o erro for no próprio log
      }
    };
  }
});

window.onerror = (msg, url, lineNo, columnNo, error) => {
    // Usa o console original aqui para evitar qualquer chance de recursão se o erro for no logger
    _originalConsole.error(`[Fatal] ${msg} @ ${url}:${lineNo}`, error);
    
    // Tenta registrar o erro fatal de forma simples
    const errorMsg = error instanceof Error ? error.message : String(msg);
    pushToLog('error', `[FATAL EXCEPTION] ${errorMsg} (${url}:${lineNo})`);
    
    return false;
};

window.onunhandledrejection = (event) => {
    _originalConsole.error(`[Promise Rejected] ${event.reason}`);
    pushToLog('error', `[UNHANDLED REJECTION] ${String(event.reason)}`);
};

console.log("Terminal Iniciado. Monitorando ambiente...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);