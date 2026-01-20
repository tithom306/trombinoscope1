
import React, { useState, useMemo } from 'react';
import { Office, Project, StaffMember, DayOfWeek, Role } from '../types';

interface OfficesAvailabilityViewProps {
  offices: Office[];
  projects: Project[];
  onUpdateAssignment: (memberId: string, day: DayOfWeek, assignment: string | null) => void;
  onUpdateAssignments: (updates: { memberId: string, day: DayOfWeek, assignment: string | null }[]) => void;
}

const DAYS: DayOfWeek[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

const OfficesAvailabilityView: React.FC<OfficesAvailabilityViewProps> = ({ offices, projects, onUpdateAssignment, onUpdateAssignments }) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Lundi');
  const [activeStationEditing, setActiveStationEditing] = useState<{office: Office, station: string} | null>(null);
  const [completingOffice, setCompletingOffice] = useState<Office | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const occupationMap = useMemo(() => {
    const map: Record<string, StaffMember & { projectName: string }> = {};
    projects.forEach(project => {
      project.members.forEach(member => {
        const assignment = member.presence.schedule[selectedDay];
        if (assignment) map[assignment] = { ...member, projectName: project.name };
      });
    });
    return map;
  }, [projects, selectedDay]);

  const unassignedByProject = useMemo(() => {
    const result: Record<string, { project: Project, members: StaffMember[] }> = {};
    const assignedIds = new Set(Object.values(occupationMap).map((m: any) => m.id));
    projects.forEach(project => {
      const available = project.members.filter(m => !assignedIds.has(m.id));
      if (available.length > 0) result[project.id] = { project, members: available };
    });
    return result;
  }, [projects, occupationMap]);

  const allMembers = useMemo(() => projects.flatMap(p => p.members.map(m => ({ ...m, projectName: p.name }))), [projects]);
  const filteredMembersForAssignment = useMemo(() => {
    const searchLower = memberSearch.toLowerCase();
    return allMembers.filter(m => m.name.toLowerCase().includes(searchLower) || m.projectName.toLowerCase().includes(searchLower));
  }, [allMembers, memberSearch]);

  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.DEVELOPER: return 'bg-sky-600';
      case Role.BUSINESS_ANALYST: return 'bg-amber-600';
      case Role.MANAGER: return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  const handleImageError = (memberId: string) => setImageErrors(prev => ({ ...prev, [memberId]: true }));

  const getAvatarUrl = (avatar: string) => {
    if (avatar.startsWith('http') || avatar.startsWith('input_file_')) return avatar;
    return `./${avatar}`;
  };

  const handleManualAssign = (memberId: string | null) => {
    if (!activeStationEditing) return;
    
    if (memberId === null) {
      const stationKey = `${activeStationEditing.office.name} - ${activeStationEditing.station}`;
      const currentOccupant = occupationMap[stationKey];
      if (currentOccupant) {
        onUpdateAssignment(currentOccupant.id, selectedDay, null);
      }
    } else {
      const assignment = `${activeStationEditing.office.name} - ${activeStationEditing.station}`;
      onUpdateAssignment(memberId, selectedDay, assignment);
    }
    
    setActiveStationEditing(null);
    setMemberSearch('');
  };

  const handleAutoFill = (projectId: string) => {
    if (!completingOffice) return;
    const availableMembers = unassignedByProject[projectId].members;
    const emptyStations = completingOffice.stations.filter(s => !occupationMap[`${completingOffice.name} - ${s}`]);
    const updates = availableMembers.slice(0, emptyStations.length).map((member, index) => ({
      memberId: member.id,
      day: selectedDay,
      assignment: `${completingOffice.name} - ${emptyStations[index]}`
    }));
    onUpdateAssignments(updates);
    setCompletingOffice(null);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-gray-100 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">Ravitaillement Flotte</h2>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">Sélecteur temporel</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl">
          {DAYS.map(day => (
            <button key={day} onClick={() => setSelectedDay(day)} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedDay === day ? 'bg-sky-500 text-white shadow-lg' : 'text-gray-400'}`}>{day}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {offices.map(office => {
          const emptyCount = office.stations.filter(s => !occupationMap[`${office.name} - ${s}`]).length;
          return (
            <div key={office.id} className="p-8 rounded-2xl border bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 transition-all">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-sky-500"><i className="fa-solid fa-plane-arrival text-xl"></i></div>
                  <div><h3 className="text-lg font-black">{office.name}</h3><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{office.stations.length} Emplacements</p></div>
                </div>
                {emptyCount > 0 && <button onClick={() => setCompletingOffice(office)} className="px-4 py-2 rounded-xl text-[9px] font-black uppercase text-white shadow-lg bg-sky-500">Embarquer ({emptyCount})</button>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {office.stations.map(station => {
                  const occupant = occupationMap[`${office.name} - ${station}`];
                  const isOccupied = !!occupant;
                  return (
                    <button key={station} onClick={() => setActiveStationEditing({office, station})} className={`p-4 rounded-2xl border flex items-center gap-5 text-left transition-all ${isOccupied ? 'bg-white dark:bg-slate-800 border-sky-50 dark:border-sky-900/30 shadow-sm' : 'bg-gray-50/50 dark:bg-black/20 border-dashed border-gray-200 dark:border-slate-800'}`}>
                      {isOccupied ? (
                        <>
                          <div className="relative flex-shrink-0">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-sky-400/50 shadow-sm">
                              {!imageErrors[occupant.id] ? (
                                <img 
                                  src={getAvatarUrl(occupant.avatar)} 
                                  className="w-full h-full object-cover brightness-[1.05]" 
                                  alt="" 
                                  onError={() => handleImageError(occupant.id)} 
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center text-lg font-black text-white ${getRoleColor(occupant.role)}`}>
                                  {getInitials(occupant.name)}
                                </div>
                              )}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-700 ${getRoleColor(occupant.role)} shadow-sm`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate leading-tight mb-1">{occupant.name}</p>
                            <span className="text-[9px] font-black uppercase text-slate-400 truncate tracking-tight">{occupant.projectName}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-300 rounded-xl"><i className="fa-solid fa-plus text-sm"></i></div>
                          <div className="flex-1"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{station}</p><span className="text-[9px] font-bold text-emerald-500 uppercase">Vacant</span></div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {activeStationEditing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-sky-100 dark:border-sky-900/30">
            <div className="p-8 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20">
              <div className="flex justify-between items-center mb-6">
                <div><h3 className="text-xl font-black text-gray-900 dark:text-white">Assigner {selectedDay}</h3><p className="text-[10px] text-sky-500 uppercase font-bold mt-1">{activeStationEditing.office.name} — {activeStationEditing.station}</p></div>
                <button onClick={() => setActiveStationEditing(null)} className="w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400"><i className="fa-solid fa-xmark"></i></button>
              </div>
              <input type="text" placeholder="Rechercher..." className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-sky-500 shadow-sm" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} autoFocus />
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-2 custom-scrollbar">
              <button onClick={() => handleManualAssign(null)} className="w-full p-4 rounded-2xl flex items-center gap-4 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500 transition-all border border-transparent hover:border-red-100 group">
                <div className="w-12 h-12 flex items-center justify-center bg-red-100 dark:bg-red-900/30 rounded-xl transition-transform group-hover:scale-105 border-2 border-red-200 dark:border-red-900/50"><i className="fa-solid fa-user-slash"></i></div>
                <div className="text-left"><p className="text-xs font-black uppercase tracking-widest">Siège Vacant</p><p className="text-[10px] opacity-70 italic font-bold">Libérer ce poste pour {selectedDay}</p></div>
              </button>

              <div className="h-px bg-gray-100 dark:bg-slate-800 my-2"></div>

              {filteredMembersForAssignment.map(member => {
                const isOccupant = occupationMap[`${activeStationEditing.office.name} - ${activeStationEditing.station}`]?.id === member.id;
                return (
                  <button 
                    key={member.id} 
                    onClick={() => handleManualAssign(member.id)} 
                    className={`w-full p-3 rounded-2xl flex items-center gap-4 transition-all group ${isOccupant ? 'bg-sky-50 dark:bg-sky-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-sky-400 shadow-sm transition-transform group-hover:scale-110">
                        {!imageErrors[member.id] ? (
                          <img 
                            src={getAvatarUrl(member.avatar)} 
                            className="w-full h-full object-cover brightness-[1.05]" 
                            alt="" 
                            onError={() => handleImageError(member.id)} 
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-xs font-black text-white ${getRoleColor(member.role)}`}>
                            {getInitials(member.name)}
                          </div>
                        )}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-700 ${getRoleColor(member.role)} shadow-sm`}></div>
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{member.name}</p>
                      <span className="text-[9px] font-black uppercase text-sky-500 block truncate">{member.projectName}</span>
                    </div>
                    {isOccupant && <i className="fa-solid fa-check text-sky-500 ml-auto mr-2"></i>}
                  </button>
                );
              })}
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/30 text-center"><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Application instantanée au plan de vol</p></div>
          </div>
        </div>
      )}

      {completingOffice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-sky-100 dark:border-sky-900/20">
            <div className="p-8 border-b bg-sky-500 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black">Embarquer : {completingOffice.name}</h3>
                  <p className="text-xs opacity-80 mt-1">Installer un équipage complet dans cet appareil.</p>
                </div>
                <button onClick={() => setCompletingOffice(null)} className="w-10 h-10 rounded-xl hover:bg-white/20 flex items-center justify-center transition-colors">
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>
            </div>
            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {Object.values(unassignedByProject).map(({project, members}) => {
                const emptySeats = officeStationsCount(completingOffice, occupationMap);
                const canFit = members.length <= emptySeats;
                return (
                  <button 
                    key={project.id} 
                    disabled={!canFit} 
                    onClick={() => handleAutoFill(project.id)} 
                    className={`p-6 rounded-2xl text-left transition-all border ${canFit ? 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-sky-500 group' : 'opacity-30 cursor-not-allowed'}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase text-sky-500">{project.name}</span>
                      {canFit && <i className="fa-solid fa-circle-check text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></i>}
                    </div>
                    <p className="text-sm font-bold mt-2 dark:text-white">{members.length} Personnel</p>
                    <p className="text-[9px] text-gray-400 mt-1 line-clamp-1">{project.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="p-6 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end">
              <button onClick={() => setCompletingOffice(null)} className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function officeStationsCount(office: Office, occupationMap: Record<string, any>) {
  return office.stations.filter(s => !occupationMap[`${office.name} - ${s}`]).length;
}

export default OfficesAvailabilityView;
