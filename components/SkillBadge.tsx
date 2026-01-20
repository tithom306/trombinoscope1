
import React from 'react';
import { Skill } from '../types';

interface SkillBadgeProps {
  skill: Skill;
  color: string;
}

const SkillBadge: React.FC<SkillBadgeProps> = ({ skill, color }) => {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1 font-medium text-gray-600 dark:text-slate-400 transition-colors">
        <span>{skill.name}</span>
        <span className="opacity-70">{skill.level}/5</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-1.5 transition-colors">
        <div 
          className={`h-1.5 rounded-full ${color} shadow-sm transition-all duration-500`} 
          style={{ width: `${(skill.level / 5) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default SkillBadge;
