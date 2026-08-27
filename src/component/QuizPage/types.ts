export interface Opsi {
  label: string;
  text: string;
}

export interface SoalPG {
  no: number;
  pertanyaan: string;
  opsi: Opsi[];
  kunci: string;
  penjelasan: string;
}

export interface SoalIsian {
  no: number;
  pertanyaan: string;
  kunci: string[];
}

export interface SoalEssay {
  no: number;
  pertanyaan: string;
  kunci: string;
}

export interface SoalAplikasiKonteks {
  no: number;
  pertanyaan: string;
  opsi: Opsi[];
  kunci: string;
  penjelasan: string;
}

export interface ModulSoal {
  modul: number;
  judul: string;
  soal: {
    pilihanGanda: SoalPG[];
    isianSingkat: SoalIsian[];
    essay: SoalEssay[];
    aplikasiKonteks: SoalAplikasiKonteks[];
  };
}

export interface LatihanSoalData {
  mataKuliah: string;
  moduls: ModulSoal[];
}
