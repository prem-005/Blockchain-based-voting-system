from django.core.management.base import BaseCommand

from apps.elections.models import Constituency, District, Election
from apps.parties_candidates.models import Candidate, Party


class Command(BaseCommand):
    help = "Add the seeded 2026 Manachanallur candidates without changing election status."

    def handle(self, *args, **kwargs):
        election = Election.objects.filter(pk=202601).first()
        district = District.objects.filter(pk=29).first()
        constituency = Constituency.objects.filter(pk=141).first()
        if not election or not district or not constituency:
            self.stdout.write(self.style.WARNING(
                "Missing prerequisite data (election 202601 / district 29 / constituency 141) — skipping candidate seed."
            ))
            return

        candidates = [
            ("S. Kathiravan", "DMK", 1, "0x1010101010101010101010101010101010101010101010101010101010101010"),
            ("M. Paranthaman", "AIADMK", 3, "0x2020202020202020202020202020202020202020202020202020202020202020"),
            ("R. Anandha Kumar", "NTK", 5, "0x3030303030303030303030303030303030303030303030303030303030303030"),
            ("Dr. K. Srinivasan", "BJP", 7, "0x4040404040404040404040404040404040404040404040404040404040404040"),
        ]

        for name, abbreviation, candidate_id, candidate_ref in candidates:
            party = Party.objects.filter(abbreviation=abbreviation).first()
            if not party:
                self.stdout.write(self.style.WARNING(f"Party {abbreviation} is missing — skipping candidate seed."))
                return
            Candidate.objects.update_or_create(
                election=election,
                constituency=constituency,
                name=name,
                defaults={
                    "candidate_id": candidate_id,
                    "candidate_ref": candidate_ref,
                    "party": party,
                    "district": district,
                    "affidavit_summary": f"Official affidavit for AC-141 ({abbreviation}).",
                    "is_active": True,
                },
            )
            self.stdout.write(f"Added {name} ({abbreviation}) as on-chain candidate #{candidate_id}.")

        election2027 = Election.objects.filter(pk=202701).first()
        if election2027:
            for name, abbreviation, candidate_id, candidate_ref in candidates:
                party = Party.objects.filter(abbreviation=abbreviation).first()
                if party:
                    ref2027 = candidate_ref[:-4] + "2027"
                    Candidate.objects.update_or_create(
                        election=election2027,
                        constituency=constituency,
                        name=name,
                        defaults={
                            "candidate_id": candidate_id,
                            "candidate_ref": ref2027,
                            "party": party,
                            "district": district,
                            "affidavit_summary": f"Official affidavit for AC-141 ({abbreviation}) 2027.",
                            "is_active": True,
                        },
                    )
            self.stdout.write(self.style.SUCCESS("2027 candidate roster is also ready."))

        self.stdout.write(self.style.SUCCESS("2026 candidate roster is ready."))
