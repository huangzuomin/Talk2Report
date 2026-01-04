import { MessageSquare, BarChart3, CheckCircle2, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * 移动端底部 Tab 导航
 * 只在 < 768px 时显示
 */
export function MobileTabNav({ activeTab, onChange }) {
  const tabs = [
    { id: 'chat', icon: MessageSquare, label: '对话' },
    { id: 'material', icon: BarChart3, label: '素材' },
    { id: 'finish', icon: CheckCircle2, label: '完成' },
    { id: 'settings', icon: Settings, label: '设置' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border-light z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around py-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                flex flex-col items-center justify-center gap-1
                px-4 py-2 rounded-lg transition-all duration-200
                min-h-[44px] min-w-[64px]
                ${isActive
                  ? 'text-accent bg-accent/5'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-background-secondary'
                }
              `}
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>
              <span className="text-label font-medium">
                {tab.label}
              </span>

              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-1 w-8 h-1 bg-accent rounded-t-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Safe Area for iOS */}
      <style jsx>{`
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          nav {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </nav>
  );
}
