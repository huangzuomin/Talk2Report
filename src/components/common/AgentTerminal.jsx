import { useEffect, useRef } from 'react';
import {
  Terminal,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

/**
 * Agent Terminal 组件 - 实时显示多智能体工作状态
 * 使用新的设计系统
 */
export function AgentTerminal({ logs, status, progress }) {
  const terminalRef = useRef(null);

  // 自动滚动到底部
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={14} className="text-success" />;
      case 'warning':
        return <AlertTriangle size={14} className="text-warning" />;
      case 'error':
        return <XCircle size={14} className="text-error" />;
      default:
        return <Activity size={14} className="text-info" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return '等待生成...';
      case 'extracting':
        return '📂 正在提取结构化数据...';
      case 'writing':
        return '✍️ 正在撰写报告...';
      case 'reviewing':
        return '⚖️ 正在审查质量...';
      case 'complete':
        return '✅ 生成完成';
      case 'error':
        return '❌ 生成失败';
      default:
        return '';
    }
  };

  return (
    <div className="agent-terminal">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-primary/30">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-success" />
          <span className="font-semibold text-small text-background-primary">Agent Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-background-primary/80">{getStatusText()}</span>
          {status !== 'idle' && status !== 'complete' && (
            <div className="spinner w-4 h-4" />
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {status !== 'idle' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-background-primary/80 mb-1.5">
            <span>进度</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="w-full bg-background-primary/30 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-success to-success-light shadow-md transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Logs */}
      <div
        ref={terminalRef}
        className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar"
      >
        {logs.length === 0 ? (
          <div className="text-background-primary/60 text-small text-center py-4">
            等待生成任务...
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="agent-log">
              <span className="agent-log-timestamp">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              {getLogIcon(log.type)}
              <span className={`agent-log-name agent-log-${log.type}`}>
                [{log.agent}]
              </span>
              <span className="text-background-primary/90 text-xs">{log.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-primary/30 flex gap-4 text-xs text-background-primary/70">
        <span>ℹ️ Info</span>
        <span className="text-success">✓ Success</span>
        <span className="text-warning">⚠ Warning</span>
        <span className="text-error">✗ Error</span>
      </div>
    </div>
  );
}
