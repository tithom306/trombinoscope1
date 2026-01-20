
import React, { useState, useEffect } from 'react';
import { StaffMember, Role, DayOfWeek, Office, Certification } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface EditMemberModalProps {
  member: StaffMember;
  offices: Office[];
  onClose: () => void;
  onSave: (updatedMember: StaffMember) => void;
}

interface QuizOption {
  text: string;
  level: number;
}

interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

const DAYS: DayOfWeek[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

const QUALIFICATION_LEVELS = [
  { level: 1, label: "Apprenti", desc: "Comprenez-vous les concepts de base ? Pouvez-vous réaliser des tâches simples guidées ?" },
  { level: 2, label: "Pratiquant", desc: "Opérationnel sur les flux standards. Produisez-vous seul sur les cas classiques ?" },
  { level: 3, label: "Autonome", desc: "Maîtrisez-vous 80% du périmètre ? Livrez-vous sans supervision directe ?" },
  { level: 4, label: "Référent", desc: "Êtes-vous consulté pour des conseils ? Résolvez-vous des incidents complexes ?" },
  { level: 5, label: "Maître", desc: "Faites-vous autorité ? Définissez-vous les standards et anticipez-vous le futur ?" }
];

const ROLE_SKILLS_SUGGESTIONS: Record<Role, string[]> = {
  [Role.DEVELOPER]: ["Python", "React", "Node.js", "AWS", "Docker", "TypeScript", "PostgreSQL"],
  [Role.BUSINESS_ANALYST]: ["Analyse de Besoins", "Rédaction User Stories", "Modélisation BPMN", "Gestion Backlog", "Facilitation", "SQL", "UML"],
  [Role.MANAGER]: ["Leadership", "Gestion Agile (Scrum)", "Planification Stratégique", "Gestion des Risques", "Coaching d'Équipe", "Recrutement"]
};

const EditMemberModal: React.FC<EditMemberModalProps> = ({ member, offices, onClose, onSave }) => {
  const [formData, setFormData] = useState<StaffMember>({ ...member, certifications: member.certifications || [] });
  const [newSkillName, setNewSkillName] = useState('');
  const [newCertName, setNewCertName] = useState('');
  const [newCertProvider, setNewCertProvider] = useState('AWS');
  const [activeGuideIndex, setActiveGuideIndex] = useState<number | null>(null);

  // Quiz States
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizSkill, setQuizSkill] = useState<string | null>(null);
  const [quizSkillIndex, setQuizSkillIndex] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  // Helper pour les icônes de certifs
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
    if (p.includes('istqb')) return 'fa-solid fa-vial text-emerald-400';
    return 'fa-solid fa-award text-amber-500';
  };

  const startQuiz = async (skillName: string, index: number) => {
    setIsQuizMode(true);
    setQuizSkill(skillName);
    setQuizSkillIndex(index);
    setIsLoadingQuiz(true);
    setQuestions([]);
    setCurrentStep(0);
    setAnswers([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Génère un questionnaire technique ou métier de 5 questions à choix multiples pour évaluer précisément le niveau d'un professionnel au poste de "${formData.role}" sur la compétence spécifique : "${skillName}". 
        
        CONTEXTE DU RÔLE : 
        - Si c'est un Développeur : Focus technique, syntaxe, architecture.
        - Si c'est un Business Analyst : Focus méthodologie, outils d'analyse, rédaction.
        - Si c'est un Manager : Focus soft skills, résolution de conflits, stratégie, pilotage.

        LES NIVEAUX (Score de 1 à 5) :
        1: Notions vagues
        2: Utilisation basique
        3: Maîtrise autonome
        4: Expert consulté par les autres
        5: Maître capable d'enseigner ou de définir les standards mondiaux

        Format : JSON. Chaque question doit avoir 4 options, chaque option est liée à un niveau (1,2,3,4,5) reflétant la maturité de la réponse.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING },
                          level: { type: Type.NUMBER }
                        },
                        required: ["text", "level"]
                      }
                    }
                  },
                  required: ["question", "options"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });

      const data = JSON.parse(response.text || '{"questions":[]}');
      setQuestions(data.questions);
    } catch (error) {
      console.error("Erreur lors de la génération du quiz:", error);
      setIsQuizMode(false);
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleAnswer = (level: number) => {
    const newAnswers = [...answers, level];
    setAnswers(newAnswers);

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      const average = Math.round(newAnswers.reduce((a, b) => a + b, 0) / newAnswers.length);
      const finalLevel = Math.max(1, Math.min(5, average));
      if (quizSkillIndex !== null) handleSkillLevelChange(quizSkillIndex, finalLevel);
      setTimeout(() => {
        setIsQuizMode(false);
        setActiveGuideIndex(quizSkillIndex);
      }, 800);
    }
  };

  const handleDayToggle = (day: DayOfWeek) => {
    const newSchedule = { ...formData.presence.schedule };
    if (newSchedule[day]) {
      delete newSchedule[day];
    } else {
      const firstOffice = offices[0];
      const firstStation = firstOffice?.stations[0];
      newSchedule[day] = firstOffice && firstStation ? `${firstOffice.name} - ${firstStation}` : 'Non assigné';
    }
    setFormData({ ...formData, presence: { schedule: newSchedule } });
  };

  const handleOfficeSelection = (day: DayOfWeek, officeName: string, stationName: string) => {
    setFormData({
      ...formData,
      presence: {
        schedule: { ...formData.presence.schedule, [day]: `${officeName} - ${stationName}` }
      }
    });
  };

  const handleSkillLevelChange = (index: number, level: number) => {
    const newSkills = [...formData.skills];
    newSkills[index] = { ...newSkills[index], level };
    setFormData({ ...formData, skills: newSkills });
  };

  const handleAddSkill = (name?: string) => {
    const skillToAdd = name || newSkillName.trim();
    if (!skillToAdd) return;
    
    if (formData.skills.some(s => s.name.toLowerCase() === skillToAdd.toLowerCase())) {
        setNewSkillName('');
        return;
    }

    setFormData({
      ...formData,
      skills: [...formData.skills, { name: skillToAdd, level: 3 }]
    });
    setNewSkillName('');
  };

  const handleRemoveSkill = (index: number) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((_, i) => i !== index)
    });
    setActiveGuideIndex(null);
  };

  const handleAddCertification = () => {
    if (!newCertName.trim()) return;
    const newCert: Certification = { name: newCertName.trim(), provider: newCertProvider };
    setFormData({
      ...formData,
      certifications: [...(formData.certifications || []), newCert]
    });
    setNewCertName('');
  };

  const handleRemoveCertification = (index: number) => {
    setFormData({
      ...formData,
      certifications: formData.certifications?.filter((_, i) => i !== index)
    });
  };

  // Filtrer les suggestions pour ne pas proposer ce que l'utilisateur a déjà
  const availableSuggestions = ROLE_SKILLS_SUGGESTIONS[formData.role].filter(
    suggested => !formData.skills.some(s => s.name.toLowerCase() === suggested.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-sky-100 dark:border-sky-900/30">
        
        {/* Quiz Overlay */}
        {isQuizMode && (
          <div className="absolute inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="max-w-xl w-full">
              <div className="mb-10">
                <div className="w-16 h-16 rounded-2xl bg-sky-500/20 flex items-center justify-center text-sky-400 mx-auto mb-6 border border-sky-500/30 animate-pulse">
                  <i className="fa-solid fa-microchip text-2xl"></i>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-[0.2em] mb-2">Diagnostic d'Expertise</h3>
                <p className="text-sky-400/60 text-[10px] font-bold uppercase tracking-widest">Compétence : {quizSkill}</p>
              </div>

              {isLoadingQuiz ? (
                <div className="space-y-6">
                  <div className="flex justify-center gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-2 h-8 bg-sky-500 animate-bounce" style={{animationDelay: `${i*0.1}s`}}></div>)}
                  </div>
                  <p className="text-sky-500/50 text-[10px] font-black uppercase tracking-[0.3em]">Initialisation du questionnaire IA...</p>
                </div>
              ) : questions.length > 0 ? (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-sky-500/50 uppercase tracking-widest mb-2">
                      <span>Analyse de profil en cours</span>
                      <span>{currentStep + 1} / {questions.length}</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500 transition-all duration-500" style={{width: `${((currentStep + 1) / questions.length) * 100}%`}}></div>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 border border-sky-500/20 p-8 rounded-3xl">
                    <h4 className="text-lg font-bold text-white mb-8 leading-relaxed">
                      {questions[currentStep].question}
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {questions[currentStep].options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAnswer(option.level)}
                          className="w-full text-left p-5 rounded-2xl border border-sky-500/10 hover:border-sky-400 hover:bg-sky-400/10 text-slate-300 hover:text-white transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors uppercase">
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <span className="text-sm font-medium">{option.text}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button onClick={() => setIsQuizMode(false)} className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-red-400 transition-colors">Abandonner le test</button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-sky-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-5">
            <div className="relative">
               <img 
                 src={formData.avatar.startsWith('http') || formData.avatar.startsWith('input_file_') ? formData.avatar : `./${formData.avatar}`} 
                 className="w-14 h-14 rounded-2xl object-cover shadow-inner bg-gray-200 border-2 border-sky-400" 
                 alt=""
                 onError={(e) => (e.currentTarget.src = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y")}
               />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                Modifier <span className="text-sky-600 dark:text-sky-400">{member.name}</span>
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-sky-500 uppercase tracking-widest font-black">{formData.role}</span>
                <span className="text-[10px] text-gray-400 px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded-md font-bold uppercase tracking-tighter">ID: {formData.id}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all flex items-center justify-center">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <section className="space-y-6">
             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-sky-500 mb-6 flex items-center gap-2">
              <i className="fa-solid fa-id-card-clip"></i> Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 ml-1">Rôle métier</label>
                <select 
                  value={formData.role} 
                  onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
                  className="w-full bg-gray-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-sky-500 transition-all dark:text-white"
                >
                  {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 ml-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-sky-500 transition-all dark:text-white" />
              </div>
            </div>
          </section>

          {/* SECTION CERTIFICATIONS */}
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-sky-500 mb-6 flex items-center gap-2">
              <i className="fa-solid fa-award"></i> Certifications Reconnues
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {formData.certifications?.map((cert, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-sky-500/20 shadow-sm flex items-center justify-center">
                      <i className={`${getProviderIcon(cert.provider)} text-sm`}></i>
                    </div>
                    <div>
                      <p className="text-[11px] font-black dark:text-white leading-tight">{cert.name}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{cert.provider}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveCertification(index)} className="text-red-400 hover:text-red-500 p-2"><i className="fa-solid fa-trash-can text-xs"></i></button>
                </div>
              ))}
            </div>
            <div className="bg-sky-50/30 dark:bg-sky-900/10 p-5 rounded-2xl border border-dashed border-sky-200 dark:border-sky-900/30 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="text" placeholder="Nom de la certif..." value={newCertName} onChange={(e) => setNewCertName(e.target.value)} className="bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs dark:text-white" />
              <select value={newCertProvider} onChange={(e) => setNewCertProvider(e.target.value)} className="bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-xs dark:text-white">
                <option value="AWS">AWS</option>
                <option value="Microsoft">Microsoft / Azure</option>
                <option value="Google">Google Cloud</option>
                <option value="Angular">Angular</option>
                <option value="React">React</option>
                <option value="Scrum.org">Scrum.org</option>
                <option value="HashiCorp">HashiCorp</option>
                <option value="ISTQB">ISTQB</option>
                <option value="Autre">Autre</option>
              </select>
              <button onClick={handleAddCertification} className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Ajouter Certif</button>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex justify-between items-end">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-sky-500 flex items-center gap-2">
                <i className="fa-solid fa-brain"></i> Expertise & Skills
              </h3>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Suggestions basées sur votre rôle</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {formData.skills.map((skill, index) => (
                <div key={index} className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                  <div className={`flex flex-col gap-4 bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border transition-all ${activeGuideIndex === index ? 'border-sky-400 ring-2 ring-sky-400/10' : 'border-gray-100 dark:border-slate-800'}`}>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-black dark:text-white truncate uppercase tracking-tight">{skill.name}</span>
                          <div className="flex gap-2">
                            <button onClick={() => startQuiz(skill.name, index)} className="text-[9px] px-3 py-1 rounded-md font-black uppercase bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"><i className="fa-solid fa-vial mr-1.5"></i> Tester mon niveau</button>
                            <button onClick={() => setActiveGuideIndex(activeGuideIndex === index ? null : index)} className={`text-[9px] px-3 py-1 rounded-md font-black uppercase transition-colors ${activeGuideIndex === index ? 'bg-sky-500 text-white' : 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300'}`}><i className="fa-solid fa-circle-question mr-1.5"></i> Guide</button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(lvl => (
                            <button key={lvl} onClick={() => handleSkillLevelChange(index, lvl)} className={`flex-1 h-2 rounded-full transition-all ${skill.level >= lvl ? 'bg-sky-600' : 'bg-gray-200 dark:bg-slate-700'}`}></button>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveSkill(index)} className="w-12 h-12 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center flex-shrink-0"><i className="fa-solid fa-trash-can text-sm"></i></button>
                    </div>
                    {activeGuideIndex === index && (
                      <div className="mt-2 pt-4 border-t border-gray-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-5 gap-2 animate-in slide-in-from-top-2">
                        {QUALIFICATION_LEVELS.map((q) => (
                          <div key={q.level} className="relative group/tooltip">
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-3 bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-sky-500/30 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 translate-y-2 group-hover/tooltip:translate-y-0 transition-all duration-300 z-[110]">
                              <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest mb-1">Détails Niveau {q.level}</p>
                              <p className="text-[10px] leading-snug text-slate-200 font-medium italic">"{q.desc}"</p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/95"></div>
                            </div>

                            <button onClick={() => handleSkillLevelChange(index, q.level)} className={`w-full p-3 rounded-xl text-left border transition-all h-full flex flex-col ${skill.level === q.level ? 'bg-sky-600 border-sky-500 text-white shadow-lg shadow-sky-600/20' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-sky-300'}`}>
                              <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-70">LVL {q.level}</p>
                              <p className="text-[9px] font-black uppercase truncate mb-1">{q.label}</p>
                              <p className="text-[8px] leading-tight line-clamp-2 opacity-60">{q.desc}</p>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="space-y-4 bg-sky-50/30 dark:bg-sky-900/10 p-5 rounded-2xl border border-dashed border-sky-200 dark:border-sky-900/30">
                {availableSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {availableSuggestions.map(suggested => (
                      <button key={suggested} onClick={() => handleAddSkill(suggested)} className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-[9px] font-black text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40 hover:bg-sky-500 hover:text-white transition-all shadow-sm">+ {suggested}</button>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <input type="text" placeholder="Ajouter une autre compétence..." value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()} className="flex-1 bg-white dark:bg-slate-900 border-none rounded-xl px-5 py-3 text-xs focus:ring-2 focus:ring-sky-500 dark:text-white" />
                  <button onClick={() => handleAddSkill()} className="bg-sky-600 hover:bg-sky-700 text-white px-8 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-600/20 transition-all">Ajouter</button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 pb-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-sky-500 mb-6 flex items-center gap-2">
              <i className="fa-solid fa-map-location-dot"></i> Plan de Vol
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {DAYS.map(day => {
                const currentAssignment = formData.presence.schedule[day] || '';
                const isPresent = !!currentAssignment;
                const [currentOfficeName, currentStationName] = currentAssignment.split(' - ');
                const selectedOffice = offices.find(o => o.name === currentOfficeName) || offices[0];
                return (
                  <div key={day} className={`flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl border transition-all ${isPresent ? 'bg-sky-50/30 dark:bg-sky-900/10 border-sky-100 dark:border-sky-900/30 shadow-sm' : 'bg-gray-50 dark:bg-slate-800 border-transparent'}`}>
                    <div className="flex items-center gap-4 min-w-[140px]">
                      <button onClick={() => handleDayToggle(day)} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isPresent ? 'bg-sky-500 text-white shadow-lg' : 'bg-gray-200 dark:bg-slate-700 text-transparent'}`}><i className="fa-solid fa-check text-xs"></i></button>
                      <span className={`text-xs font-black uppercase tracking-tight ${isPresent ? 'text-sky-600 dark:text-sky-400' : 'text-gray-400'}`}>{day}</span>
                    </div>
                    {isPresent ? (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <select value={currentOfficeName} onChange={(e) => {
                          const newOffice = offices.find(o => o.name === e.target.value);
                          if (newOffice) handleOfficeSelection(day, newOffice.name, newOffice.stations[0]);
                        }} className="w-full bg-white dark:bg-slate-700 border-none rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-sky-500 dark:text-white shadow-sm">
                          {offices.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                        </select>
                        <select value={currentStationName} onChange={(e) => handleOfficeSelection(day, currentOfficeName, e.target.value)} className="w-full bg-white dark:bg-slate-700 border-none rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-sky-500 dark:text-white shadow-sm">
                          {selectedOffice?.stations.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center"><span className="text-[10px] font-bold text-gray-400 dark:text-slate-600 italic uppercase tracking-widest">Base ou Télétravail</span></div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="p-8 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20 flex justify-end gap-4">
          <button onClick={onClose} className="px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all">Annuler</button>
          <button onClick={() => onSave(formData)} className="px-12 py-4 rounded-xl bg-sky-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-sky-600/30 dark:shadow-none hover:bg-sky-700 hover:scale-105 active:scale-95 transition-all">Sauvegarder</button>
        </div>
      </div>
    </div>
  );
};

export default EditMemberModal;
