import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.elections': 'Elections',
    'nav.voter_registration': 'Voter Registration',
    'nav.verify_receipt': 'Verify Receipt',
    'nav.election_info': 'Election Info',
    'nav.help': 'Help & Support',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    'nav.voter_portal': 'Voter Portal',
    'nav.profile': 'My Profile',
    'nav.admin_console': 'Admin Console',

    // Hero
    'hero.title_line1': 'Secure Voting',
    'hero.title_line2': 'for a Stronger',
    'hero.title_line3': 'Tamil Nadu',
    'hero.subtitle': 'A transparent, accessible and privacy-focused electronic voting platform.',
    'hero.view_elections': 'View Elections',
    'hero.register': 'Register to Vote',
    'hero.badge': 'Tamil Nadu Assembly Election 2027',

    // Services
    'service.registration.title': 'Voter Registration',
    'service.registration.desc': 'Apply online and check your approval status',
    'service.info.title': 'Election Information',
    'service.info.desc': 'View schedule, constituencies and guidelines',
    'service.vote.title': 'Cast Your Vote',
    'service.vote.desc': 'Vote for candidates in your constituency',
    'service.verify.title': 'Verify Receipt',
    'service.verify.desc': 'Verify your ballot commitment on the blockchain',

    // Dashboard
    'dashboard.status_pending': 'Pending Review',
    'dashboard.status_approved': 'Approved',
    'dashboard.status_rejected': 'Rejected',
    'dashboard.constituency': 'Electoral Constituency',
    'dashboard.eligible': 'Eligible to Vote',
    'dashboard.yes': 'Yes',
    'dashboard.no': 'No (Pending Approval)',
    'dashboard.pending_msg': 'Your registration application is currently pending review by the District Electoral Officer. Once approved, you will be eligible to cast your ballot.',
    'dashboard.active_election': 'Current Active Election',
    'dashboard.cast_vote': 'Proceed to Ballot',

    // Profile
    'profile.title': 'Elector Identification Profile',
    'profile.subtitle': 'Official Voter & Electoral Registration Record',
    'profile.epic_number': 'EPIC / Voter ID',
    'profile.full_name': 'Full Legal Name',
    'profile.dob': 'Date of Birth',
    'profile.mobile': 'Registered Mobile',
    'profile.email': 'Email Address',
    'profile.district': 'District',
    'profile.constituency': 'Assembly Constituency',
    'profile.address': 'Registered Address',
    'profile.pincode': 'Postal PIN Code',
    'profile.status': 'Application Status',
    'profile.registered_on': 'Registration Date',
    'profile.wallet': 'Linked Wallet Address',

    // Ballot
    'ballot.pending_title': 'Account Awaiting Admin Approval',
    'ballot.pending_desc': 'Your voter registration application is currently under review by the District Electoral Officer. Voting is permitted only for approved electors.',
    'ballot.title': 'Official Ballot Paper',
    'ballot.confirm_title': 'Review and Confirm Your Selection',
    'ballot.confirm_btn': 'Confirm & Cast Vote',
    'ballot.select_candidate': 'Select Candidate',

    // Help
    'help.title': 'Voter Assistance & Help Center',
    'help.subtitle': 'Frequently Asked Questions & Tamil Nadu Electoral Support',
    'help.q1': 'How do I know when my voter application is approved?',
    'help.a1': 'After registering online, the District Election Officer verifies your age (18+) and residency. You can log into your Voter Portal at any time to see if your status has changed from "Pending Review" to "Approved".',
    'help.q2': 'Can I vote immediately after registering?',
    'help.a2': 'No. For election integrity, all voter registrations must be approved by the designated District Administrator before you can access the ballot and cast your vote.',
    'help.q3': 'How does LightVote protect my secret ballot?',
    'help.a3': 'LightVote uses a cryptographic nullifier to reject repeat votes. The blockchain does not store your name or voter ID, but your transaction publicly includes the candidate ID and sender wallet, so this prototype does not provide ballot secrecy.',
    'help.q4': 'How do I verify that my vote was counted?',
    'help.a4': 'After voting, you receive a cryptographic receipt containing a transaction hash and block number. Use the "Verify Receipt" page to confirm your vote exists on the blockchain.',
    'help.toll_free': 'Toll-Free Helpline',
    'help.contact_eci': 'Election Commission of India National Helpline: 1950',
  },
  ta: {
    // Navigation
    'nav.home': 'முகப்பு',
    'nav.elections': 'தேர்தல்கள்',
    'nav.voter_registration': 'வாக்காளர் பதிவு',
    'nav.verify_receipt': 'ரசீதை சரிபார்க்கவும்',
    'nav.election_info': 'தேர்தல் தகவல்',
    'nav.help': 'உதவி மையம்',
    'nav.login': 'உள்நுழை',
    'nav.logout': 'வெளியேறு',
    'nav.voter_portal': 'வாக்காளர் தளம்',
    'nav.profile': 'என் சுயவிவரம்',
    'nav.admin_console': 'நிர்வாக கன்சோல்',

    // Hero
    'hero.title_line1': 'பாதுகாப்பான வாக்குப்பதிவு',
    'hero.title_line2': 'வளமான',
    'hero.title_line3': 'தமிழ்நாட்டிற்கு',
    'hero.subtitle': 'வெளிப்படையான, அணுகக்கூடிய மற்றும் தனியுரிமை சார்ந்த மின்னணு வாக்குப்பதிவு தளம்.',
    'hero.view_elections': 'தேர்தல்களைப் பார்க்கவும்',
    'hero.register': 'வாக்காளராக பதிவு செய்க',
    'hero.badge': 'தமிழ்நாடு சட்டமன்ற தேர்தல் 2027',

    // Services
    'service.registration.title': 'வாக்காளர் பதிவு',
    'service.registration.desc': 'ஆன்லைனில் விண்ணப்பித்து ஒப்புதல் நிலையை சரிபார்க்கவும்',
    'service.info.title': 'தேர்தல் தகவல்',
    'service.info.desc': 'அட்டவணை, தொகுதிகள் மற்றும் வழிகாட்டுதல்களைப் பார்க்கவும்',
    'service.vote.title': 'உங்கள் வாக்கை செலுத்துங்கள்',
    'service.vote.desc': 'உங்கள் தொகுதி வேட்பாளர்களுக்கு வாக்களியுங்கள்',
    'service.verify.title': 'ரசீதை சரிபார்க்கவும்',
    'service.verify.desc': 'பிளாக்செயினில் உங்கள் வாக்கு உறுதிப்பாட்டை சரிபார்க்கவும்',

    // Dashboard
    'dashboard.status_pending': 'பரிசீலனையில் உள்ளது',
    'dashboard.status_approved': 'ஒப்புதல் அளிக்கப்பட்டது',
    'dashboard.status_rejected': 'நிராகரிக்கப்பட்டது',
    'dashboard.constituency': 'சட்டமன்ற தொகுதி',
    'dashboard.eligible': 'வாக்களிக்க தகுதி',
    'dashboard.yes': 'ஆம் (தகுதியுடையவர்)',
    'dashboard.no': 'இல்லை (ஒப்புதலுக்காக காத்திருக்கிறது)',
    'dashboard.pending_msg': 'உங்கள் வாக்காளர் விண்ணப்பம் மாவட்ட தேர்தல் அலுவலரின் பரிசீலனையில் உள்ளது. ஒப்புதல் அளிக்கப்பட்ட பிறகு நீங்கள் வாக்களிக்க முடியும்.',
    'dashboard.active_election': 'தற்போதைய தேர்தல்',
    'dashboard.cast_vote': 'வாக்களிக்க தொடரவும்',

    // Profile
    'profile.title': 'வாக்காளர் அடையாள விவரங்கள்',
    'profile.subtitle': 'அதிகாரப்பூர்வ வாக்காளர் பதிவு மற்றும் விவரங்கள்',
    'profile.epic_number': 'வாக்காளர் அடையாள அட்டை எண் (EPIC)',
    'profile.full_name': 'முழுப் பெயர்',
    'profile.dob': 'பிறந்த தேதி',
    'profile.mobile': 'பதிவு செய்யப்பட்ட அலைபேசி',
    'profile.email': 'மின்னஞ்சல் முகவரி',
    'profile.district': 'மாவட்டம்',
    'profile.constituency': 'சட்டமன்ற தொகுதி',
    'profile.address': 'முகவரி',
    'profile.pincode': 'அஞ்சல் குறியீட்டு எண்',
    'profile.status': 'விண்ணப்ப நிலை',
    'profile.registered_on': 'பதிவு செய்த நாள்',
    'profile.wallet': 'இணைக்கப்பட்ட வாலட் முகவரி',

    // Ballot
    'ballot.pending_title': 'நிர்வாகியின் ஒப்புதலுக்காக காத்திருக்கிறது',
    'ballot.pending_desc': 'உங்கள் விண்ணப்பம் மாவட்ட தேர்தல் அலுவலரால் இன்னும் அங்கீகரிக்கப்படவில்லை. அங்கீகரிக்கப்பட்ட வாக்காளர்கள் மட்டுமே வாக்களிக்க முடியும்.',
    'ballot.title': 'அதிகாரப்பூர்வ வாக்குச்சீட்டு',
    'ballot.confirm_title': 'உங்கள் தேர்வை மதிப்பாய்வு செய்து உறுதிப்படுத்தவும்',
    'ballot.confirm_btn': 'வாக்கை உறுதிசெய்து பதிவு செய்யவும்',
    'ballot.select_candidate': 'வேட்பாளரை தேர்ந்தெடுக்கவும்',

    // Help
    'help.title': 'வாக்காளர் உதவி மையம்',
    'help.subtitle': 'அடிக்கடி கேட்கப்படும் கேள்விகள் மற்றும் தேர்தல் உதவி',
    'help.q1': 'எனது விண்ணப்பம் எப்போது அங்கீகரிக்கப்படும்?',
    'help.a1': 'விண்ணப்பித்த பிறகு மாவட்ட தேர்தல் அலுவலர் உங்கள் வயது (18+) மற்றும் இருப்பிடத்தை சரிபார்த்து ஒப்புதல் அளிப்பார்.',
    'help.q2': 'பதிவு செய்த உடனேயே வாக்களிக்க முடியுமா?',
    'help.a2': 'முடியாது. தேர்தல் நேர்மைக்காக, மாவட்ட நிர்வாகியால் ஒப்புதல் அளிக்கப்பட்ட பிறகே வாக்குச்சீட்டை அணுக முடியும்.',
    'help.q3': 'எனது ரகசிய வாக்கு எவ்வாறு பாதுகாக்கப்படுகிறது?',
    'help.a3': 'கிரிப்டோகிராஃபிக் நுல்லிஃபையர் மூலம் உங்கள் அடையாளம் வேட்பாளருடன் இணைக்கப்படாமல் வாக்கு பதிவு செய்யப்படுகிறது.',
    'help.q4': 'எனது வாக்கு பதிவாகிவிட்டதை எப்படி அறிவது?',
    'help.a4': 'வாக்களித்த பிறகு கிடைக்கும் ரசீது எண் மற்றும் பரிவர்த்தனை குறியீட்டை "ரசீதை சரிபார்க்கவும்" பக்கத்தில் சோதிக்கலாம்.',
    'help.toll_free': 'கட்டணமில்லா உதவி எண்',
    'help.contact_eci': 'இந்திய தேர்தல் ஆணைய உதவி எண்: 1950',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('lightvote_lang') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('lightvote_lang', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
