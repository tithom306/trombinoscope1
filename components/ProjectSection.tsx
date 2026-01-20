
import React from 'react';
import { Project, StaffMember } from '../types';
import StaffCard from './StaffCard';

interface ProjectSectionProps {
  project: Project;
  viewMode: 'talents' | 'planning';
  onEditMember: (member: StaffMember) => void;
}

const ProjectSection: React.FC<ProjectSectionProps> = ({ project, viewMode, onEditMember }) => {
  return (
    <div className="mb-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-end gap-2 text-sky-600 dark:text-sky-400">
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-plane-departure text-xl"></i>
          <h2 className="text-2xl font-black leading-none tracking-tight">{project.name}</h2>
        </div>
        <p className="text-gray-500 dark:text-slate-500 text-sm font-medium border-l-0 md:border-l-2 md:pl-3 md:ml-1 md:border-gray-200 dark:md:border-slate-800">
          {project.description}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {project.members.map(member => (
          <StaffCard 
            key={member.id} 
            member={member} 
            viewMode={viewMode} 
            onEdit={() => onEditMember(member)}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectSection;
