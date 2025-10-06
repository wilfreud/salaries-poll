export const formations = ["Master", "DIC", "DIT", "TELECOM"] as const;
export const specialties = ["SSI", "IABD", "INFO"] as const;
export const contractTypes = [
  "Stage",
  "Alternance",
  "CDD",
  "CDI",
  "Prestation de service",
] as const;
export const participantTypes = ["Étudiant", "Alumni"] as const;

export type Formation = (typeof formations)[number];
export type Specialty = (typeof specialties)[number];
export type ContractType = (typeof contractTypes)[number];
export type ParticipantType = (typeof participantTypes)[number];

export interface SalaryEntry {
  id: string;
  created_at: string;
  formation: Formation;
  speciality: Specialty;
  contract_type: ContractType;
  salary: number;
  participant_type: ParticipantType;
  job_title: string | null;
}

export interface SalaryFilters {
  formation?: Formation;
  contractType?: ContractType;
  speciality?: Specialty;
  participantType?: ParticipantType;
}

export interface SalaryInsert {
  formation: Formation;
  speciality: Specialty;
  contract_type: ContractType;
  salary: number;
  participant_type: ParticipantType;
  job_title?: string | null;
}

export interface SalaryMetrics {
  totalParticipants: number;
  averageByFormation: Record<Formation, number>;
  averageBySpecialty: Record<Specialty, number>;
  averageByContract: Record<ContractType, number>;
  countByParticipantType: Record<ParticipantType, number>;
  salariesByRange: Array<{ label: string; count: number }>;
  countByFormation: Record<Formation, number>;
  countBySpecialty: Record<Specialty, number>;
  averageBySpecialtyAndFormation: Array<{
    speciality: Specialty;
    formation: Formation;
    averageSalary: number;
  }>;
  latestEntries: Array<
    Pick<
      SalaryEntry,
      | "formation"
      | "speciality"
      | "contract_type"
      | "salary"
      | "participant_type"
      | "created_at"
      | "job_title"
    >
  >;
}
