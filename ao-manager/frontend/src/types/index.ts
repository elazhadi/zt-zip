export interface Societe {
  id: number
  code: string
  raison_sociale: string
  forme_juridique?: string
  rc?: string
  if_fiscal?: string
  ice?: string
  cnss?: string
  patente?: string
  adresse?: string
  ville?: string
  gerant?: string
  capital?: number
  email?: string
  tel?: string
  rib?: string
  logo_path?: string
  entete_path?: string
  domaines?: string[]
  banque_domiciliation?: string
  titre_directeur_banque?: string
  created_at: string
}

export interface MaitreOuvrage {
  nom: string
  adresse?: string
  ville?: string
  type?: string
  titre?: string
}

export interface Article {
  numero: number
  designation: string
  specifications_techniques?: string
  quantite?: number
  unite?: string
  marque_exigee?: string
  norme?: string
  certification?: string
  prix_unitaire?: number
  montant?: number
}

export interface Lot {
  numero: number
  designation: string
  articles: Article[]
}

export interface AppelOffre {
  id: number
  reference?: string
  objet?: string
  maitre_ouvrage?: MaitreOuvrage
  date_limite?: string
  procedure?: string
  domaine?: string
  reserve_tpme: boolean
  estimation?: number
  lots?: Lot[]
  caution_provisoire?: number
  delai_execution?: { valeur: number; unite: string }
  delai_garantie?: { valeur: number; unite: string }
  lieu_realisation?: string
  marque_specifique?: { exigee: boolean; details: string }
  prospectus_exige: boolean
  echantillon_exige: boolean
  tete_de_serie: boolean
  offre_technique_exigee: boolean
  criteres_notation?: { critere: string; poids: number; details: string }[]
  notation_technique?: { seuil_elimination: number; note_maximale: number }
  fichiers_dao?: string[]
  statut: AOStatut
  decision?: 'oui' | 'non' | 'en_attente'
  notes?: string
  created_at: string
}

export type AOStatut =
  | 'en_instance'
  | 'en_cours_de_reponse'
  | 'en_attente_de_resultats'
  | 'en_adjudication'
  | 'marche_en_cours'
  | 'en_paiement'
  | 'en_garantie'
  | 'cloture'
  | 'perdu'
  | 'annule'

export interface Reponse {
  id: number
  ao_id: number
  societe_id: number
  pct_estimation?: number
  montant_ht?: number
  montant_ttc?: number
  prix_detail?: ArticlePrix[]
  fichiers_generes?: Record<string, unknown>
  zip_path?: string
  date_soumission?: string
  created_at: string
}

export interface ArticlePrix {
  numero: number
  designation: string
  quantite: number
  unite: string
  prix_unitaire: number
  montant: number
}

export interface Marche {
  id: number
  ao_id: number
  reponse_id?: number
  societe_id: number
  numero_marche?: string
  montant_ht?: number
  montant_ttc?: number
  caution_definitive?: number
  retenue_garantie?: number
  statut_execution?: string
  etapes?: EtapeMarche[]
  fichiers?: Record<string, string>
  created_at: string
}

export interface EtapeMarche {
  etape: string
  date: string
  notes?: string
  montant_facture?: number
  montant_recu?: number
}

export interface DocumentRef {
  id: number
  societe_id: number
  type_doc: string
  file_path?: string
  date_certification?: string
  date_expiration?: string
  infos_extraites?: Record<string, unknown>
  version: number
  warnings: string[]
  created_at: string
}

export const STATUT_CONFIG: Record<AOStatut, { label: string; color: string; bg: string }> = {
  en_instance: { label: 'En instance', color: 'text-gray-600', bg: 'bg-gray-100' },
  en_cours_de_reponse: { label: 'En cours de réponse', color: 'text-blue-700', bg: 'bg-blue-100' },
  en_attente_de_resultats: { label: 'En attente de résultats', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  en_adjudication: { label: 'En adjudication', color: 'text-orange-700', bg: 'bg-orange-100' },
  marche_en_cours: { label: 'Marché en cours', color: 'text-green-700', bg: 'bg-green-100' },
  en_paiement: { label: 'En paiement', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  en_garantie: { label: 'En garantie', color: 'text-purple-700', bg: 'bg-purple-100' },
  cloture: { label: 'Clôturé', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  perdu: { label: 'Perdu', color: 'text-red-700', bg: 'bg-red-100' },
  annule: { label: 'Annulé', color: 'text-rose-800', bg: 'bg-rose-100' },
}

export const DOMAINES = [
  'Informatique & Développement logiciel',
  'Fournitures de bureau et consommables',
  'Équipements techniques et industriels',
  'Aménagement et décoration',
  'Travaux de construction et rénovation',
  'Services de maintenance',
  'Fournitures médicales et paramédicales',
  'Fournitures alimentaires',
  'Équipements militaires et sécurité civile',
  'Mobilier et ameublement',
  'Matériel pédagogique et culturel',
  'Événementiel et communication',
  'Transport et logistique',
  'Fournitures agricoles',
]
