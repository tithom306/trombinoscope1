
export enum Role {
  DEVELOPER = 'Développeur',
  BUSINESS_ANALYST = 'Business Analyst',
  MANAGER = 'Manager'
}

export interface Skill {
  name: string;
  level: number; // 1 to 5
}

export interface Certification {
  name: string;
  provider: string; // ex: AWS, Microsoft, Scrum.org
}

export type DayOfWeek = 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi';

export interface Office {
  id: string;
  name: string;
  stations: string[]; // Liste des noms de postes
}

export interface PresenceInfo {
  // Le planning associe un jour à un bureau spécifique sous forme "Nom Bureau - Poste"
  schedule: Partial<Record<DayOfWeek, string>>;
}

export interface StaffMember {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  email: string;
  skills: Skill[];
  certifications?: Certification[];
  presence: PresenceInfo;
  bio?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  members: StaffMember[];
}

export interface AppMetadata {
  name: string;
  description: string;
  projects: Project[];
  offices: Office[];
}
