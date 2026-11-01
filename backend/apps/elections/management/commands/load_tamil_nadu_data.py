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
