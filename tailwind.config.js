/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 响应式断点
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },

      // Professional Dashboard 色彩系统
      colors: {
        // Primary - Deep Blue (专业仪表盘主色)
        primary: {
          DEFAULT: '#3B82F6',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },

        // Success - Emerald (已填充状态)
        success: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },

        // Warning - Amber (冲突/警告)
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },

        // Info - Cyan (提取中状态)
        info: {
          DEFAULT: '#06B6D4',
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },

        // Neutral - Slate (背景/文字)
        neutral: {
          DEFAULT: '#64748B',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },

        // Accent - Gold (强调色,保留原有金色)
        accent: {
          DEFAULT: '#c9a961',
          50: '#fcfaf4',
          100: '#f9f5e8',
          200: '#efe8cf',
          300: '#e2d6ad',
          400: '#d4c087',
          500: '#c9a961',
          600: '#a68b4d',
          700: '#826d3d',
          800: '#5e4f2d',
          900: '#3a311d',
        },

        // 语义化颜色别名
        background: {
          primary: '#ffffff',
          secondary: '#F8FAFC',
          tertiary: '#F1F5F9',
        },

        text: {
          primary: '#0F172A',
          secondary: '#475569',
          tertiary: '#94A3B8',
        },

        border: {
          light: '#E2E8F0',
          medium: '#CBD5E1',
          dark: '#94A3B8',
        },

        // 向后兼容
        error: '#ef4444',
      },

      // 字体家族 - Editorial Luxury Magazine 风格
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['IBM Plex Serif', 'Georgia', 'serif'],
        display: ['Playfair Display', 'Georgia', 'serif'], // 新增：优雅标题字体
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },

      // 字体大小
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        // 语义化字体大小
        'h1': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h2': ['1.875rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }],
        'h4': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'small': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'tiny': ['0.75rem', { lineHeight: '1.5', fontWeight: '400' }],
      },

      // 间距系统
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '104': '26rem',
      },

      // 圆角系统
      borderRadius: {
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },

      // 阴影系统 - 更柔和的阴影
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
      },

      // 动画
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite',
      },

      keyframes: {
        'pulse-ring': {
          '0%, 100%': {
            transform: 'scale(1)',
            opacity: '1'
          },
          '50%': {
            transform: 'scale(1.1)',
            opacity: '0.7'
          },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },

      // 背景渐变
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
