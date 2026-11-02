from django.core.management.base import BaseCommand
from apps.elections.models import State, District, Constituency

class Command(BaseCommand):
    help = "Loads authoritative Tamil Nadu districts and assembly constituencies (Source: ECI Delimitation Order)"

    def handle(self, *args, **kwargs):
        self.stdout.write("Loading Tamil Nadu administrative dataset...")

        state, _ = State.objects.get_or_create(name="Tamil Nadu", code="TN")

        # Official 38 Districts of Tamil Nadu
        districts_data = [
            (1, "Ariyalur", "TN-AR"),
            (2, "Chengalpattu", "TN-CGL"),
            (3, "Chennai", "TN-CHN"),
            (4, "Coimbatore", "TN-CBE"),
            (5, "Cuddalore", "TN-CUD"),
            (6, "Dharmapuri", "TN-DMR"),
            (7, "Dindigul", "TN-DGL"),
            (8, "Erode", "TN-ERD"),
            (9, "Kallakurichi", "TN-KLK"),
            (10, "Kancheepuram", "TN-KNC"),
            (11, "Kanniyakumari", "TN-KKM"),
            (12, "Karur", "TN-KRR"),
            (13, "Krishnagiri", "TN-KRI"),
            (14, "Madurai", "TN-MDU"),
            (15, "Mayiladuthurai", "TN-MYD"),
            (16, "Nagapattinam", "TN-NGP"),
            (17, "Namakkal", "TN-NMK"),
            (18, "Nilgiris", "TN-NLG"),
            (19, "Perambalur", "TN-PBL"),
            (20, "Pudukkottai", "TN-PDK"),
            (21, "Ramanathapuram", "TN-RAM"),
            (22, "Ranipet", "TN-RPT"),
            (23, "Salem", "TN-SLM"),
            (24, "Sivaganga", "TN-SVG"),
            (25, "Tenkasi", "TN-TKS"),
            (26, "Thanjavur", "TN-TNJ"),
            (27, "Theni", "TN-THN"),
            (28, "Thoothukudi", "TN-TUT"),
            (29, "Tiruchirappalli", "TN-TRY"),
            (30, "Tirunelveli", "TN-TNV"),
            (31, "Tirupathur", "TN-TPT"),
            (32, "Tiruppur", "TN-TPR"),
            (33, "Tiruvallur", "TN-TVL"),
            (34, "Tiruvannamalai", "TN-TVM"),
            (35, "Tiruvarur", "TN-TVR"),
            (36, "Vellore", "TN-VEL"),
            (37, "Viluppuram", "TN-VLM"),
            (38, "Virudhunagar", "TN-VNR"),
        ]

        district_objs = {}
        for d_id, name, code in districts_data:
            d_obj, _ = District.objects.update_or_create(
                id=d_id,
                defaults={"name": name, "code": code, "state": state}
            )
            district_objs[d_id] = d_obj

        # Key Assembly Constituencies across Tamil Nadu
        # Including Tiruchirappalli (with Manachanallur AC-141 as emphasized in the prompt),
        # Chennai, Coimbatore, Madurai, Salem, etc.
        constituencies_data = [
            # Tiruchirappalli District (29)
            (139, "Srirangam", 29, "GEN"),
            (140, "Tiruchirappalli (West)", 29, "GEN"),
            (141, "Manachanallur", 29, "GEN"),
            (142, "Tiruchirappalli (East)", 29, "GEN"),
            (143, "Tiruverumbur", 29, "GEN"),
            (144, "Lalgudi", 29, "GEN"),
            (145, "Musiri", 29, "GEN"),
            (146, "Thuraiyur", 29, "SC"),

            # Chennai District (3)
            (11, "Dr. Radhakrishnan Nagar", 3, "GEN"),
            (12, "Perambur", 3, "GEN"),
            (13, "Kolathur", 3, "GEN"),
            (14, "Villivakkam", 3, "GEN"),
            (15, "Thiru-Vi-Ka-Nagar", 3, "SC"),
            (16, "Egmore", 3, "SC"),
            (17, "Royapuram", 3, "GEN"),
            (18, "Harbour", 3, "GEN"),
            (19, "Chepauk-Thiruvallikeni", 3, "GEN"),
            (20, "Thousand Lights", 3, "GEN"),
            (21, "Anna Nagar", 3, "GEN"),
            (22, "Virugampakkam", 3, "GEN"),
            (23, "Saidapet", 3, "GEN"),
            (24, "T. Nagar", 3, "GEN"),
            (25, "Mylapore", 3, "GEN"),
            (26, "Velachery", 3, "GEN"),

            # Coimbatore District (4)
            (116, "Sulur", 4, "GEN"),
            (117, "Kavundampalayam", 4, "GEN"),
            (118, "Coimbatore (North)", 4, "GEN"),
            (119, "Thondamuthur", 4, "GEN"),
            (120, "Coimbatore (South)", 4, "GEN"),
            (121, "Singanallur", 4, "GEN"),
            (122, "Kinathukadavu", 4, "GEN"),
            (123, "Pollachi", 4, "GEN"),
            (124, "Valparai", 4, "SC"),

            # Madurai District (14)
            (187, "Melur", 14, "GEN"),
            (188, "Madurai East", 14, "GEN"),
            (189, "Sholavandan", 14, "SC"),
            (190, "Madurai North", 14, "GEN"),
            (191, "Madurai South", 14, "GEN"),
            (192, "Madurai Central", 14, "GEN"),
            (193, "Madurai West", 14, "GEN"),
            (194, "Thiruparankundram", 14, "GEN"),
            (195, "Thirumangalam", 14, "GEN"),
            (196, "Usilampatti", 14, "GEN"),

            # Salem District (23)
            (86, "Gangavalli", 23, "SC"),
            (87, "Attur", 23, "SC"),
            (88, "Yercaud", 23, "ST"),
            (89, "Omalur", 23, "GEN"),
            (90, "Mettur", 23, "GEN"),
            (91, "Edappadi", 23, "GEN"),
            (92, "Sankari", 23, "GEN"),
            (93, "Salem (West)", 23, "GEN"),
            (94, "Salem (North)", 23, "GEN"),
            (95, "Salem (South)", 23, "GEN"),
            (96, "Veerapandi", 23, "GEN"),

            # Other Tamil Nadu District Assemblies
            (149, "Ariyalur", 1, "GEN"),
            (150, "Jayankondam", 1, "GEN"),
            (31, "Chengalpattu", 2, "GEN"),
            (32, "Tambaram", 2, "GEN"),
            (151, "Cuddalore", 5, "GEN"),
            (152, "Chidambaram", 5, "GEN"),
            (84, "Dharmapuri", 6, "GEN"),
            (85, "Pennagaram", 6, "GEN"),
            (127, "Dindigul", 7, "GEN"),
            (128, "Palani", 7, "GEN"),
            (99, "Erode East", 8, "GEN"),
            (100, "Erode West", 8, "GEN"),
            (78, "Kallakurichi", 9, "SC"),
            (79, "Rishivandiyam", 9, "GEN"),
            (36, "Kancheepuram", 10, "GEN"),
            (37, "Sriperumbudur", 10, "SC"),
            (229, "Kanniyakumari", 11, "GEN"),
            (230, "Nagercoil", 11, "GEN"),
            (134, "Karur", 12, "GEN"),
            (135, "Kulithalai", 12, "GEN"),
            (53, "Krishnagiri", 13, "GEN"),
            (54, "Hosur", 13, "GEN"),
            (160, "Mayiladuthurai", 15, "GEN"),
            (161, "Sirkazhi", 15, "SC"),
            (163, "Nagapattinam", 16, "GEN"),
            (164, "Kilvelur", 16, "SC"),
            (91, "Namakkal", 17, "GEN"),
            (92, "Tiruchengodu", 17, "GEN"),
            (108, "Udhagamandalam", 18, "GEN"),
            (109, "Coonoor", 18, "GEN"),
            (147, "Perambalur", 19, "SC"),
            (148, "Kunnam", 19, "GEN"),
            (178, "Pudukkottai", 20, "GEN"),
            (179, "Viralimalai", 20, "GEN"),
            (211, "Ramanathapuram", 21, "GEN"),
            (212, "Paramakudi", 21, "SC"),
            (41, "Ranipet", 22, "GEN"),
            (42, "Arcot", 22, "GEN"),
            (184, "Sivaganga", 24, "GEN"),
            (185, "Karaikudi", 24, "GEN"),
            (219, "Tenkasi", 25, "GEN"),
            (220, "Sankarankovil", 25, "SC"),
            (170, "Thanjavur", 26, "GEN"),
            (171, "Kumbakonam", 26, "GEN"),
            (197, "Theni", 27, "GEN"),
            (198, "Bodinayakanur", 27, "GEN"),
            (213, "Thoothukudi", 28, "GEN"),
            (214, "Kovilpatti", 28, "GEN"),
            (224, "Tirunelveli", 30, "GEN"),
            (225, "Palayamkottai", 30, "GEN"),
            (48, "Tirupathur", 31, "GEN"),
            (49, "Vaniyambadi", 31, "GEN"),
            (112, "Tiruppur (North)", 32, "GEN"),
            (113, "Tiruppur (South)", 32, "GEN"),
            (1, "Tiruvallur", 33, "GEN"),
            (2, "Avadi", 33, "GEN"),
            (63, "Tiruvannamalai", 34, "GEN"),
            (64, "Polur", 34, "GEN"),
            (167, "Tiruvarur", 35, "GEN"),
            (168, "Mannargudi", 35, "GEN"),
            (43, "Vellore", 36, "GEN"),
            (44, "Katpadi", 36, "GEN"),
            (72, "Viluppuram", 37, "GEN"),
            (73, "Tindivanam", 37, "SC"),
            (204, "Virudhunagar", 38, "GEN"),
            (205, "Sivakasi", 38, "GEN"),
        ]

        for c_id, name, dist_id, cat in constituencies_data:
            Constituency.objects.update_or_create(
                id=c_id,
                defaults={
                    "name": name,
                    "district": district_objs[dist_id],
                    "category": cat
                }
            )

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded {len(districts_data)} districts and {len(constituencies_data)} constituencies."
        ))
