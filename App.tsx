
import React, { useState, useMemo, useEffect } from 'react';
import { Role, Project, StaffMember, Office, DayOfWeek } from './types';
import ProjectSection from './components/ProjectSection';
import OfficesAvailabilityView from './components/OfficesAvailabilityView';
import EditMemberModal from './components/EditMemberModal';

const DAYS: DayOfWeek[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | 'All'>('All');
  const [viewMode, setViewMode] = useState<'talents' | 'planning' | 'offices'>('talents');
  const [editingMember, setEditingMember] = useState<{member: StaffMember, projectId: string} | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const savedProjects = localStorage.getItem('team_canvas_data_projects');
    const savedOffices = localStorage.getItem('team_canvas_data_offices');
    const savedVersion = localStorage.getItem('team_canvas_data_version');
    
    fetch('./metadata.json')
      .then(response => response.json())
      .then((data: any) => {
        const currentVersion = data.version || "1.0";
        if (savedProjects && savedOffices && savedVersion === currentVersion) {
          setProjects(JSON.parse(savedProjects));
          setOffices(JSON.parse(savedOffices));
          setIsLoading(false);
        } else {
          loadFreshData(data);
        }
      })
      .catch(error => {
        console.error('Data error:', error);
        setIsLoading(false);
      });
  }, []);

  const loadFreshData = (data: any) => {
    setProjects(data.projects);
    setOffices(data.offices);
    saveToLocalStorage(data.projects, data.offices, data.version || "1.0");
    setIsLoading(false);
  };

  const saveToLocalStorage = (projData: Project[], offData: Office[], version?: string) => {
    localStorage.setItem('team_canvas_data_projects', JSON.stringify(projData));
    localStorage.setItem('team_canvas_data_offices', JSON.stringify(offData));
    if (version) localStorage.setItem('team_canvas_data_version', version);
  };

  const handleUpdateMember = (updatedMember: StaffMember, projectId: string) => {
    const newProjects = projects.map(proj => {
      if (proj.id === projectId) {
        return { ...proj, members: proj.members.map(m => m.id === updatedMember.id ? updatedMember : m) };
      }
      return proj;
    });
    setProjects(newProjects);
    saveToLocalStorage(newProjects, offices, localStorage.getItem('team_canvas_data_version') || undefined);
    setEditingMember(null);
  };

  const handleBulkAssignmentUpdate = (updates: { memberId: string, day: DayOfWeek, assignment: string | null }[]) => {
    setProjects(prevProjects => {
      let currentProjects = [...prevProjects];
      updates.forEach(({ memberId, day, assignment }) => {
        currentProjects = currentProjects.map(proj => ({
          ...proj,
          members: proj.members.map(member => {
            if (member.id === memberId) {
              const newSchedule = { ...member.presence.schedule };
              if (assignment === null) delete newSchedule[day];
              else newSchedule[day] = assignment;
              return { ...member, presence: { schedule: newSchedule } };
            }
            if (assignment !== null && member.presence.schedule[day] === assignment) {
                const newSchedule = { ...member.presence.schedule };
                delete newSchedule[day];
                return { ...member, presence: { schedule: newSchedule } };
            }
            return member;
          })
        }));
      });
      saveToLocalStorage(currentProjects, offices, localStorage.getItem('team_canvas_data_version') || undefined);
      return currentProjects;
    });
  };

  const handleGlobalAssignmentUpdate = (memberId: string, day: DayOfWeek, assignment: string | null) => {
    handleBulkAssignmentUpdate([{ memberId, day, assignment }]);
  };

  const handleExportJSON = () => {
    const dataToExport = {
      name: "SkyCenter Export",
      version: localStorage.getItem('team_canvas_data_version') || "2.0",
      projects: projects,
      offices: offices,
      requestFramePermissions: [],
      description: "Dernière sauvegarde du plan de vol"
    };
    
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `skycenter_config_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredProjects = useMemo(() => {
    return projects.map(project => ({
      ...project,
      members: project.members.filter(member => {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = member.name.toLowerCase().includes(searchLower);
        const matchesSkill = member.skills.some(s => s.name.toLowerCase().includes(searchLower));
        const matchesCert = member.certifications?.some(c => 
          c.name.toLowerCase().includes(searchLower) || 
          c.provider.toLowerCase().includes(searchLower)
        ) || false;

        const matchesSearch = matchesName || matchesSkill || matchesCert;
        const matchesRole = selectedRole === 'All' || member.role === selectedRole;
        return matchesSearch && matchesRole;
      })
    })).filter(project => project.members.length > 0);
  }, [projects, searchTerm, selectedRole]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-sky-50 dark:bg-slate-950"><div className="w-16 h-16 border-4 border-t-sky-500 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen transition-colors duration-500 font-sans bg-sky-50 dark:bg-slate-950">
      <style>{`
        .staff-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(14, 165, 233, 0.2); box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07); }
        .dark .staff-card { background: rgba(15, 23, 42, 0.7); border-color: rgba(14, 165, 233, 0.1); }
      `}</style>
      
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all bg-sky-500 shadow-sky-500/20">
              <i className="fa-solid fa-plane text-xl"></i>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-black leading-none tracking-tight">SkyCenter</h1>
              <p className="text-[10px] font-bold text-sky-500 tracking-[0.2em] uppercase mt-1">Plateau Operational Excellence</p>
            </div>
          </div>

          <div className="hidden md:flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            <button onClick={() => setViewMode('talents')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'talents' ? 'bg-white dark:bg-slate-700 text-sky-600' : 'text-gray-400'}`}>Personnel</button>
            <button onClick={() => setViewMode('planning')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'planning' ? 'bg-white dark:bg-slate-700 text-sky-600' : 'text-gray-400'}`}>Plan de Vol</button>
            <button onClick={() => setViewMode('offices')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'offices' ? 'bg-white dark:bg-slate-700 text-sky-600' : 'text-gray-400'}`}>Appareils</button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportJSON} 
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-500" 
              title="Exporter la configuration (JSON)"
            >
              <i className="fa-solid fa-download"></i>
            </button>
            <button 
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-500" 
              title="Paramètres de l'application"
            >
              <i className="fa-solid fa-gear"></i>
            </button>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-500"
              title={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
            >
              <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {viewMode !== 'offices' && (
          <div className="mb-10 flex flex-col md:flex-row gap-4 items-stretch animate-in fade-in duration-300">
            <div className="relative flex-1 group">
              <input 
                type="text" 
                placeholder="Rechercher un membre, une compétence ou une certification (ex: AWS)..." 
                className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl py-5 pl-14 pr-6 text-sm focus:ring-2 focus:ring-sky-500 shadow-xl shadow-sky-500/5 transition-all h-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-sky-400 text-lg group-focus-within:scale-110 transition-transform"></i>
            </div>
            
            <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-xl shadow-sky-500/5 items-center overflow-x-auto no-scrollbar">
              <button onClick={() => setSelectedRole('All')} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedRole === 'All' ? 'bg-sky-500 text-white shadow-lg' : 'text-gray-400 hover:text-sky-500'}`}>Tous</button>
              {Object.values(Role).map(role => (
                <button key={role} onClick={() => setSelectedRole(role)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedRole === role ? 'bg-sky-500 text-white shadow-lg' : 'text-gray-400 hover:text-sky-500'}`}>{role}</button>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'offices' ? (
          <OfficesAvailabilityView offices={offices} projects={projects} onUpdateAssignment={handleGlobalAssignmentUpdate} onUpdateAssignments={handleBulkAssignmentUpdate} />
        ) : (
          filteredProjects.map(project => (
            <ProjectSection key={project.id} project={project} viewMode={viewMode} onEditMember={(m) => setEditingMember({member: m, projectId: project.id})} />
          ))
        )}
      </main>

      {editingMember && <EditMemberModal member={editingMember.member} offices={offices} onClose={() => setEditingMember(null)} onSave={(u) => handleUpdateMember(u, editingMember.projectId)} />}
    </div>
  );
};

export default App;
