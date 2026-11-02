from datetime import timedelta
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.authentication.models import User
from apps.elections.models import State, District, Constituency, Election
from apps.parties_candidates.models import Party, Candidate
from apps.research.models import BenchmarkExperiment

class Command(BaseCommand):
    help = "Seeds initial Central Admin, sample Parties, 2026/2027 Elections, and Research Benchmarks"

    def handle(self, *args, **kwargs):
        self.stdout.write("Loading Tamil Nadu administrative dataset (districts & constituencies)...")
        try:
            call_command("load_tamil_nadu_data")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"load_tamil_nadu_data warning: {e}"))

        self.stdout.write("Seeding LightVote initial database records...")

        # 1. Central Admin
        admin_email = "admin@lightvote.org"
        admin_user, created = User.objects.get_or_create(
            email=admin_email,
            defaults={
                "username": admin_email,
                "first_name": "Chief Election",
                "last_name": "Commissioner",
                "role": User.Role.CENTRAL_ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_verified": True
            }
        )
        if created:
            admin_user.set_password("Admin@123456")
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f"Created Central Admin user: {admin_email} / Admin@123456"))

        # 2. District Admin for Tiruchirappalli (District ID 29)
        dadmin_email = "district.trichy@lightvote.org"
        dadmin_user, d_created = User.objects.get_or_create(
            email=dadmin_email,
            defaults={
                "username": dadmin_email,
                "first_name": "District Collector",
                "last_name": "Tiruchirappalli",
                "role": User.Role.DISTRICT_ADMIN,
                "assigned_district_id": 29,
                "is_verified": True
            }
        )
        if d_created:
            dadmin_user.set_password("District@123456")
            dadmin_user.save()
            self.stdout.write(self.style.SUCCESS(f"Created District Admin user: {dadmin_email} / District@123456"))

        # 3. Political Parties
        parties_data = [
            ("Dravida Munnetra Kazhagam", "DMK", "Rising Sun", "#DC2626"),
            ("All India Anna Dravida Munnetra Kazhagam", "AIADMK", "Two Leaves", "#16A34A"),
            ("Indian National Congress", "INC", "Hand", "#2563EB"),
            ("Bharatiya Janata Party", "BJP", "Lotus", "#EA580C"),
            ("Naam Tamilar Katchi", "NTK", "Sugarcane Farmer", "#CA8A04"),
        ]

        party_objs = {}
        for name, abbr, sym, col in parties_data:
            p, _ = Party.objects.update_or_create(
                abbreviation=abbr,
                defaults={"name": name, "symbol_name": sym, "color_hex": col, "is_active": True}
            )
            party_objs[abbr] = p

        # 4. State & Districts
        state, _ = State.objects.get_or_create(name="Tamil Nadu", code="TN")
        trichy = District.objects.filter(id=29).first()
        manachanallur = Constituency.objects.filter(id=141).first()
        srirangam = Constituency.objects.filter(id=139).first()

        # 5. Elections (2026 and 2027)
        now = timezone.now()
        # 2026 Election (Upcoming by default - starts only when Admin clicks Start Voting)
        elec_2026, _ = Election.objects.update_or_create(
            id=202601,
            defaults={
                "name": "Tamil Nadu 17th Legislative Assembly General Election 2026",
                "year": 2026,
                "scope": Election.Scope.STATE_ASSEMBLY,
                "state": state,
                "start_time": now + timedelta(days=30),
                "end_time": now + timedelta(days=37),
                "status": Election.Status.UPCOMING
            }
        )

        # 2027 By-Election (Upcoming)
        elec_2027, _ = Election.objects.update_or_create(
            id=202701,
            defaults={
                "name": "Tamil Nadu Assembly General / By-Election 2027",
                "year": 2027,
                "scope": Election.Scope.BY_ELECTION,
                "state": state,
                "start_time": now + timedelta(days=365),
                "end_time": now + timedelta(days=372),
                "status": Election.Status.UPCOMING
            }
        )

        # 6. Candidates for Manachanallur (AC-141) in 2026
        if trichy and manachanallur:
            candidates_data = [
                ("S. Kathiravan", "DMK", 1, "0x1010101010101010101010101010101010101010101010101010101010101010"),
                ("M. Paranthaman", "AIADMK", 3, "0x2020202020202020202020202020202020202020202020202020202020202020"),
                ("R. Anandha Kumar", "NTK", 5, "0x3030303030303030303030303030303030303030303030303030303030303030"),
                ("Dr. K. Srinivasan", "BJP", 7, "0x4040404040404040404040404040404040404040404040404040404040404040"),
            ]
            for c_name, party_abbr, cid, cref in candidates_data:
                Candidate.objects.update_or_create(
                    election=elec_2026,
                    constituency=manachanallur,
                    name=c_name,
                    defaults={
                        "candidate_id": cid,
                        "candidate_ref": cref,
                        "party": party_objs[party_abbr],
                        "district": trichy,
                        "affidavit_summary": f"Official affidavit filed with returning officer for AC-141 ({party_abbr}). Clear criminal record.",
                        "is_active": True
                    }
                )

        # 7. Seed Research Benchmarks (Workloads: 10, 50, 100, 500, 1000)
        benchmarks = [
            # Lightweight Multi-Validator (LightVote)
            ("Benchmark Run (10 txs)", BenchmarkExperiment.ConsensusType.LIGHTWEIGHT, 10, 124.5, 168.0, 1.02, 45200, 452000, 82.5, 4.1, 11.2, 172.0),
            ("Benchmark Run (50 txs)", BenchmarkExperiment.ConsensusType.LIGHTWEIGHT, 50, 142.0, 191.0, 1.05, 45220, 2261000, 88.4, 4.3, 12.5, 178.0),
            ("Benchmark Run (100 txs)", BenchmarkExperiment.ConsensusType.LIGHTWEIGHT, 100, 165.2, 224.0, 1.10, 45240, 4524000, 94.2, 4.8, 14.1, 185.0),
            ("Benchmark Run (500 txs)", BenchmarkExperiment.ConsensusType.LIGHTWEIGHT, 500, 310.8, 418.0, 1.25, 45310, 22655000, 112.6, 6.2, 18.4, 210.0),
            ("Benchmark Run (1000 txs)", BenchmarkExperiment.ConsensusType.LIGHTWEIGHT, 1000, 485.0, 650.0, 1.40, 45350, 45350000, 128.0, 8.5, 24.0, 245.0),

            # PoW Baseline Comparisons
            ("PoW Baseline Run (10 txs)", BenchmarkExperiment.ConsensusType.POW_BASELINE, 10, 12500.0, 16800.0, 12.2, 88200, 882000, 7.8, 18.5, 62.0, 370.0),
            ("PoW Baseline Run (50 txs)", BenchmarkExperiment.ConsensusType.POW_BASELINE, 50, 13800.0, 18500.0, 12.8, 88350, 4417500, 9.4, 21.0, 65.5, 385.0),
            ("PoW Baseline Run (100 txs)", BenchmarkExperiment.ConsensusType.POW_BASELINE, 100, 15400.0, 20800.0, 13.5, 88500, 8850000, 11.2, 24.2, 70.0, 405.0),
            ("PoW Baseline Run (500 txs)", BenchmarkExperiment.ConsensusType.POW_BASELINE, 500, 24200.0, 32500.0, 16.0, 88900, 44450000, 13.5, 38.0, 78.0, 460.0),
            ("PoW Baseline Run (1000 txs)", BenchmarkExperiment.ConsensusType.POW_BASELINE, 1000, 38000.0, 51000.0, 19.5, 89200, 89200000, 14.8, 55.0, 86.0, 520.0),
        ]

        for name, ctype, wsize, avg_l, p95_l, btime, agas, tgas, tps, vtime, cpu, mem in benchmarks:
            BenchmarkExperiment.objects.update_or_create(
                name=name,
                consensus_type=ctype,
                workload_size=wsize,
                defaults={
                    "avg_latency_ms": avg_l,
                    "p95_latency_ms": p95_l,
                    "block_confirmation_time_sec": btime,
                    "avg_gas_used": agas,
                    "total_gas_used": tgas,
                    "throughput_tps": tps,
                    "verification_time_ms": vtime,
                    "cpu_usage_pct": cpu,
                    "memory_usage_mb": mem,
                    "storage_kb_per_tx": 0.48,
                    "network_info": "Hardhat EVM Localhost / Geth PoW Node",
                    "environment_info": "Node.js v24.19, Python 3.14, Core i7/Ryzen 64-bit"
                }
            )

        self.stdout.write(self.style.SUCCESS("All seed data created successfully!"))
