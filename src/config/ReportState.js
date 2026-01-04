/**
 * ReportState 槽位定义
 * 混合式访谈架构的核心数据结构
 */

export const INITIAL_SLOTS = [
  // 核心成果
  {
    key: "achievement_1",
    label: "核心成果一",
    description: "最重要的项目或成果，包括项目名称、职责范围、完成时间",
    value: null,
    required: true,
    status: "empty",
    category: "achievements"
  },
  {
    key: "achievement_2",
    label: "核心成果二",
    description: "第二重要的项目或成果",
    value: null,
    required: true,
    status: "empty",
    category: "achievements"
  },
  {
    key: "achievement_3",
    label: "核心成果三",
    description: "第三重要的项目或成果",
    value: null,
    required: false, // 选填
    status: "empty",
    category: "achievements"
  },

  // 量化指标
  {
    key: "metrics_achievement",
    label: "成果量化数据",
    description: "具体的数字、百分比、效率提升、成本节约等可量化指标",
    value: null,
    required: true,
    status: "empty",
    category: "metrics"
  },
  {
    key: "evidence_feedback",
    label: "他人反馈/评价",
    description: "来自领导、同事、客户的正面反馈或表扬",
    value: null,
    required: false,
    status: "empty",
    category: "metrics"
  },
  {
    key: "awards_honors",
    label: "奖项/荣誉",
    description: "获得的奖项、证书、公开表彰等",
    value: null,
    required: false,
    status: "empty",
    category: "metrics"
  },

  // 挑战应对
  {
    key: "challenge_situation",
    label: "最大挑战",
    description: "工作中遇到的最大困难或阻碍",
    value: null,
    required: true,
    status: "empty",
    category: "challenges"
  },
  {
    key: "challenge_actions",
    label: "应对措施",
    description: "为解决挑战采取的具体行动或方案",
    value: null,
    required: true,
    status: "empty",
    category: "challenges"
  },
  {
    key: "challenge_outcome",
    label: "解决结果",
    description: "挑战解决后的结果或收获",
    value: null,
    required: true,
    status: "empty",
    category: "challenges"
  },

  // 个人成长
  {
    key: "growth_skills",
    label: "新技能学习",
    description: "今年掌握的新技术、工具或方法",
    value: null,
    required: false,
    status: "empty",
    category: "growth"
  },
  {
    key: "growth_reflection",
    label: "反思与改进",
    description: "对自身工作的反思和改进方向",
    value: null,
    required: false,
    status: "empty",
    category: "growth"
  },

  // 团队贡献
  {
    key: "team_contribution",
    label: "团队贡献",
    description: "对团队文化、协作、知识分享的贡献",
    value: null,
    required: false,
    status: "empty",
    category: "team"
  },
  {
    key: "mentoring",
    label: "指导他人",
    description: "指导新人、培训、知识传递等",
    value: null,
    required: false,
    status: "empty",
    category: "team"
  },

  // 未来规划
  {
    key: "future_goals",
    label: "明年目标",
    description: "明年的工作目标或期望达成的成就",
    value: null,
    required: true,
    status: "empty",
    category: "future"
  },
  {
    key: "support_needed",
    label: "所需支持",
    description: "希望获得的资源、培训或支持",
    value: null,
    required: false,
    status: "empty",
    category: "future"
  }
];

/**
 * 初始状态
 */
export const INITIAL_STATE = {
  slots: INITIAL_SLOTS,
  conversation_round: 0,
  is_finished: false,
  current_focus_slot: null // 当前正在聚焦的槽位
};

/**
 * 槽位分类
 */
export const SLOT_CATEGORIES = {
  achievements: { label: "核心成果", icon: "🏆", order: 1 },
  metrics: { label: "量化证据", icon: "📊", order: 2 },
  challenges: { label: "挑战应对", icon: "💪", order: 3 },
  growth: { label: "个人成长", icon: "🌱", order: 4 },
  team: { label: "团队贡献", icon: "🤝", order: 5 },
  future: { label: "未来规划", icon: "🎯", order: 6 }
};

/**
 * 计算完成度
 */
export const calculateCompletion = (slots) => {
  const required = slots.filter(s => s.required);
  const completed = required.filter(s => s.value !== null && s.value !== "SKIPPED");
  return {
    total: required.length,
    completed: completed.length,
    percentage: Math.round((completed.length / required.length) * 100)
  };
};
