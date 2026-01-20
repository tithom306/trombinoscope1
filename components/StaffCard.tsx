import React, { useState, useRef } from 'react';
import { StaffMember, Role, DayOfWeek } from '../types';
import SkillBadge from './SkillBadge';
import * as htmlToImage from 'html-to-image';

interface StaffCardProps {
  member: StaffMember;
  viewMode: 'talents' | 'planning';
  onEdit: () => void;
}

const DAYS: DayOfWeek[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

const StaffCard: React.FC<StaffCardProps> = ({ member, viewMode, onEdit }) => {
  const [imgError, setImgError] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.DEVELOPER: return 'bg-sky-600';
      case Role.BUSINESS_ANALYST: return 'bg-amber-600';
      case Role.MANAGER: return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  const getProviderIcon = (provider: string) => {
    const p = provider.toLowerCase();
    if (p.includes('aws')) return 'fa-brands fa-aws text-orange-400';
    if (p.includes('microsoft') || p.includes('azure')) return 'fa-brands fa-microsoft text-blue-400';
    if (p.includes('google')) return 'fa-brands fa-google text-red-400';
    if (p.includes('angular')) return 'fa-brands fa-angular text-red-600';
    if (p.includes('meta') || p.includes('react')) return 'fa-brands fa-react text-sky-400';
    if (p.includes('hashicorp')) return 'fa-solid fa-square-h text-purple-400';
    if (p.includes('scrum')) return 'fa-solid fa-s text-sky-400';
    if (p.includes('cncf') || p.includes('kubernetes')) return 'fa-solid fa-dharmachakra text-blue-500';
    return 'fa-solid fa-award text-amber-500';
  };

  const handleCopyAsImage = async () => {
    if (!cardRef.current) return;
    setIsCopying(true);
    
    try {
      // Détecter le thème actuel
      const isDark = document.documentElement.classList.contains('dark');
      
      // Masquer les boutons d'action et la section contact pour la capture
      const elementsToHide = cardRef.current.querySelectorAll('.action-button, .contact-section');
      elementsToHide.forEach(el => (el as HTMLElement).style.display = 'none');

      // Définir les couleurs de fond opaques selon le thème
      const bgColor = isDark ? '#0f172a' : '#ffffff';

      const blob = await htmlToImage.toBlob(cardRef.current, {
        backgroundColor: bgColor,
        pixelRatio: 2,
        cacheBust: true,
        style: {
          borderRadius: '16px',
          transform: 'scale(1)',
          background: bgColor 
        }
      });

      if (blob) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
      }
      
      // Rétablir l'affichage des éléments
      elementsToHide.forEach(el => (el as HTMLElement).style.display = '');
    } catch (err) {
      console.error('Erreur lors de la capture :', err);
    } finally {
      setTimeout(() => setIsCopying(false), 2000);
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  const imageSrc = member.avatar.startsWith('http') || member.avatar.startsWith('input_file_') 
    ? member.avatar 
    : `./${member.avatar}`;

  return (
    <div 
      ref={cardRef}
      className="staff-card relative p-8 flex flex-col items-center group h-fit self-start transition-all duration-300 min-h-[520px] border bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-sky-100 dark:border-sky-900/30 rounded-2xl shadow-xl"
    >
      {/* Boutons d'action */}
      <div className="absolute top-4 right-4 flex gap-2 z-20">
        <button 
          onClick={handleCopyAsImage} 
          disabled={isCopying}
          className={`action-button w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 shadow-sm ${isCopying ? '!opacity-100 text-emerald-500' : ''}`}
          title="Copier la fiche en image"
        >
          <i className={`fa-solid ${isCopying ? 'fa-check' : 'fa-image'}`}></i>
        </button>
        <button 
          onClick={onEdit} 
          className="action-button w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-md flex items-center justify-center text-gray-400 hover:text-sky-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
          title="Modifier le profil"
        >
          <i className="fa-solid fa-sliders"></i>
        </button>
      </div>
      
      <div className="relative w-full flex justify-center mb-6">
        <div className="absolute left-0 top-2 grid grid-rows-4 grid-flow-col gap-2">
          {member.certifications?.map((cert, i) => (
            <div key={i} className="relative group/cert">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-sky-500/20 shadow-sm flex items-center justify-center cursor-help hover:border-sky-400 transition-colors">
                <i className={`${getProviderIcon(cert.provider)} text-sm`}></i>
              </div>
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest whitespace-nowrap rounded-lg shadow-xl opacity-0 group-hover/cert:opacity-100 pointer-events-none transition-opacity z-30 border border-sky-500/30">
                {cert.name}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg ring-2 ring-sky-400/30">
            {!imgError ? (
              <img 
                src={imageSrc} 
                alt={member.name} 
                crossOrigin="anonymous"
                onError={() => setImgError(true)} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 brightness-[1.05] contrast-[1.02]" 
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-3xl font-black text-white ${getRoleColor(member.role)}`}>
                {getInitials(member.name)}
              </div>
            )}
          </div>
          <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white dark:border-slate-800 ${getRoleColor(member.role)} shadow-md flex items-center justify-center text-[10px] text-white font-bold`}>
            <i className="fa-solid fa-certificate"></i>
          </div>
        </div>
      </div>
      
      <div className="text-center mb-6 w-full">
        <h3 className="text-xl font-black truncate px-2 dark:text-white">{member.name}</h3>
        <span className="inline-block mt-2 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-black bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
          {member.role}
        </span>
      </div>
      
      <div className="w-full mt-2 pt-6 border-t border-gray-100 dark:border-slate-800 flex-1">
        {viewMode === 'talents' ? (
          <div className="space-y-4">
             <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 mb-4">Aptitudes</h4>
             {member.skills.slice(0, 5).map((skill, idx) => (<SkillBadge key={idx} skill={skill} color={getRoleColor(member.role)} />))}
          </div>
        ) : (
          <div className="space-y-3">
             <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 mb-4">Plan de Vol</h4>
             {DAYS.map((day) => {
                const loc = member.presence.schedule[day];
                return (
                  <div key={day} className={`flex items-center justify-between p-3 rounded-2xl transition-colors ${loc ? 'bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/30' : 'opacity-30'}`}>
                    <span className="text-[10px] font-black uppercase dark:text-white">{day}</span>
                    {loc ? (
                      <span className="text-[9px] font-black text-sky-600 dark:text-sky-400 truncate max-w-[140px] flex items-center gap-1"><i className="fa-solid fa-location-dot text-[8px]"></i>{loc}</span>
                    ) : (
                      <span className="text-[9px] italic font-bold dark:text-slate-400">Base (TT)</span>
                    )}
                  </div>
                );
             })}
          </div>
        )}
      </div>

      {/* Section Contact - Identifiée par .contact-section pour le masquage lors de la capture */}
      <div className="contact-section mt-8 pt-6 w-full flex justify-center border-t border-gray-50 dark:border-white/5">
        <a href={`mailto:${member.email}`} className="text-gray-400 hover:text-sky-600 transition-all flex items-center gap-2">
          <i className="fa-solid fa-headset"></i>
          <span className="text-[10px] font-black uppercase tracking-widest">Contact</span>
        </a>
      </div>
    </div>
  );
};

export default StaffCard;