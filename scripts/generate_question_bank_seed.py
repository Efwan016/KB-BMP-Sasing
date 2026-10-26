#!/usr/bin/env python3
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "supabase" / "seed" / "question-banks"
OUTPUT_FILE = ROOT / "supabase" / "question_bank_seed.sql"
SUBJECTS = (
    "Bahasa_Indonesia",
    "Basic_Reading",
    "Basic_Writting",
    "Cybermedia",
    "PKN",
    "Pancasila",
)
CONTENT_SUBJECT_OVERRIDES = {
    ("latihan_soal", "Basic_Writting"): "Basic_Writing",
}


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    statements = [
        "-- Generated locally from supabase/seed/question-banks. Do not commit this file.",
        "begin;",
    ]

    for subject in SUBJECTS:
        for bank_type, prefix in (
            ("practice_question_banks", "latihan_soal"),
            ("exam_question_banks", "ujian"),
        ):
            filename = f"{prefix}_{subject.lower()}.json"
            path = SOURCE_DIR / filename
            bank = json.loads(path.read_text(encoding="utf-8"))
            expected_content_subject = CONTENT_SUBJECT_OVERRIDES.get((prefix, subject), subject)
            if bank.get("mataKuliah") != expected_content_subject:
                raise ValueError(f"{filename}: mataKuliah tidak cocok dengan nama file.")
            if not isinstance(bank.get("moduls"), list) or not bank["moduls"]:
                raise ValueError(f"{filename}: moduls harus berupa array yang tidak kosong.")
            if prefix == "ujian":
                question_count = sum(
                    len(items)
                    for module in bank["moduls"]
                    for items in module.get("soal", {}).values()
                )
                if question_count != 30:
                    raise ValueError(f"{filename}: diharapkan 30 soal, ditemukan {question_count}.")
            serialized = json.dumps(bank, ensure_ascii=False, separators=(",", ":"))
            statements.append(
                f"insert into private.{bank_type} (matkul, content) values "
                f"({sql_literal(subject)}, {sql_literal(serialized)}::jsonb) "
                "on conflict (matkul) do update set content = excluded.content, updated_at = now();"
            )

    statements.append("commit;")
    OUTPUT_FILE.write_text("\n\n".join(statements) + "\n", encoding="utf-8")
    print(f"Generated {OUTPUT_FILE.relative_to(ROOT)}")
    print(f"Output size: {OUTPUT_FILE.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
