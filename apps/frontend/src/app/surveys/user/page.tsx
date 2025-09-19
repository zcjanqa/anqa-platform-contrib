// apps/frontend/src/app/surveys/user/page.tsx
import { PageShell, Container, Hero, GradientText } from "../../page_blueprint";
import { SurveyIntroCard, InfoCard, SurveyUiSettingsProvider } from "@/components/surveys/SurveyKit";
import { DynamicSurvey, type SurveyDefinition } from "@/components/surveys/DynamicSurvey";

export const metadata = {
  title: "ANQA | User Survey",
  description: "AI-powered ADHD diagnostics — user perspectives survey.",
};

const definition: SurveyDefinition = {
  // Keep survey_id stable for backend compatibility
  id: "patient:v1",
  title: "ANQA Digital Health - User Survey",
  description: "AI-Powered ADHD Diagnostics Market Research",
  sections: [
    {
      legend: "Section A: Demographics & Background",
      items: [
        { type: "checkboxGroup", name: "age", options: [
          { id: "age_18_24", label: "18-24" },
          { id: "age_25_34", label: "25-34" },
          { id: "age_35_44", label: "35-44" },
          { id: "age_45_54", label: "45-54" },
          { id: "age_55_64", label: "55-64" },
          { id: "age_65_plus", label: "65+" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "gender", options: [
          { id: "gender_female", label: "Female" },
          { id: "gender_male", label: "Male" },
          { id: "gender_nb", label: "Non-binary" },
          { id: "gender_na", label: "Prefer not to say" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "country", options: [
          { id: "country_at", label: "Austria" },
          { id: "country_de", label: "Germany" },
          { id: "country_ch", label: "Switzerland" },
        ], allowOther: true, maxSelections: 2 },
        { type: "checkboxGroup", name: "language", options: [
          { id: "lang_de", label: "German" },
          { id: "lang_en", label: "English" },
        ], allowOther: true, maxSelections: 2 },
        { type: "checkboxGroup", name: "education", options: [
          { id: "edu_lt_hs", label: "Less than high school" },
          { id: "edu_hs", label: "High school diploma" },
          { id: "edu_some_college", label: "Some college/university" },
          { id: "edu_bachelor", label: "Bachelor's degree" },
          { id: "edu_master_plus", label: "Master's degree or higher" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "employment", options: [
          { id: "emp_ft", label: "Employed full-time" },
          { id: "emp_pt", label: "Employed part-time" },
          { id: "emp_self", label: "Self-employed" },
          { id: "emp_student", label: "Student" },
          { id: "emp_unemployed", label: "Unemployed" },
          { id: "emp_retired", label: "Retired" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "income", options: [
          { id: "inc_lt_25k", label: "Under €25,000" },
          { id: "inc_25_45", label: "€25,000-€45,000" },
          { id: "inc_45_65", label: "€45,000-€65,000" },
          { id: "inc_65_85", label: "€65,000-€85,000" },
          { id: "inc_gt_85k", label: "Over €85,000" },
          { id: "inc_na", label: "Prefer not to say" },
        ], maxSelections: 1 },
      ],
    },
    {
      legend: "Section B: ADHD Experience & Diagnosis History",
      items: [
        { type: "checkboxGroup", name: "adhd_status", options: [
          { id: "adhd_dx", label: "Officially diagnosed with ADHD" },
          { id: "adhd_self", label: "Self-diagnosed/suspect ADHD but not formally diagnosed" },
          { id: "adhd_considering", label: "Considering evaluation for ADHD" },
          { id: "adhd_none", label: "No ADHD diagnosis or suspicion" },
          { id: "adhd_caregiver", label: "Parent/caregiver of someone with/suspected ADHD" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "adhd_type", options: [
          { id: "type_inattentive", label: "ADHD - Inattentive type" },
          { id: "type_hyper", label: "ADHD - Hyperactive/Impulsive type" },
          { id: "type_combined", label: "ADHD - Combined type" },
          { id: "type_unsure", label: "Not sure/don't remember" },
          { id: "type_na", label: "Not applicable" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "age_dx", options: [
          { id: "age_u12", label: "Under 12" },
          { id: "age_12_17", label: "12-17" },
          { id: "age_18_25", label: "18-25" },
          { id: "age_26_35", label: "26-35" },
          { id: "age_36_45", label: "36-45" },
          { id: "age_45p", label: "Over 45" },
          { id: "age_na", label: "Not applicable" },
        ], maxSelections: 1 },
      ],
    },
    {
      legend: "Section C: Current Diagnostic Experience & Pain Points",
      items: [
        { type: "checkboxGroup", name: "time_to_dx", options: [
          { id: "t_lt_1m", label: "Less than 1 month" },
          { id: "t_1_3m", label: "1-3 months" },
          { id: "t_4_6m", label: "4-6 months" },
          { id: "t_7_12m", label: "7-12 months" },
          { id: "t_1_2y", label: "1-2 years" },
          { id: "t_gt_2y", label: "More than 2 years" },
          { id: "t_waiting", label: "Still waiting for diagnosis" },
          { id: "t_na", label: "Not applicable" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "num_specialists", options: [
          { id: "sp_1", label: "1" },
          { id: "sp_2_3", label: "2-3" },
          { id: "sp_4_5", label: "4-5" },
          { id: "sp_6_8", label: "6-8" },
          { id: "sp_gt_8", label: "More than 8" },
          { id: "sp_na", label: "Not applicable" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "oop_cost", options: [
          { id: "cost_0", label: "€0 (fully covered by insurance)" },
          { id: "cost_1_200", label: "€1-€200" },
          { id: "cost_201_500", label: "€201-€500" },
          { id: "cost_501_1000", label: "€501-€1,000" },
          { id: "cost_1001_2000", label: "€1,001-€2,000" },
          { id: "cost_gt_2000", label: "More than €2,000" },
          { id: "cost_unsure", label: "Not sure/don't remember" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "satisfaction", options: [
          { id: "sat_1", label: "1 - Very dissatisfied" },
          { id: "sat_2", label: "2 - Dissatisfied" },
          { id: "sat_3", label: "3 - Neutral" },
          { id: "sat_4", label: "4 - Satisfied" },
          { id: "sat_5", label: "5 - Very satisfied" },
          { id: "sat_na", label: "Not applicable" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "barriers", options: [
          { id: "bar_wait", label: "Long waiting times for appointments" },
          { id: "bar_cost", label: "High cost/poor insurance coverage" },
          { id: "bar_find", label: "Difficulty finding qualified specialists" },
          { id: "bar_dismiss", label: "Dismissive or uninformed healthcare providers" },
          { id: "bar_stigma", label: "Stigma/embarrassment" },
          { id: "bar_distance", label: "Geographic distance to specialists" },
          { id: "bar_lang", label: "Language barriers" },
          { id: "bar_minimized", label: "Feeling that symptoms were minimized" },
          { id: "bar_bias", label: "Bias related to gender/age/background" },
          { id: "bar_paper", label: "Complex paperwork/bureaucracy" },
        ], allowOther: true },
        { type: "heading", text: "C6. Importance ratings (1-5)" },
        { type: "scale", name: "importance_speed", min: 1, max: 5 },
        { type: "scale", name: "importance_cost", min: 1, max: 5 },
        { type: "scale", name: "importance_accuracy", min: 1, max: 5 },
        { type: "scale", name: "importance_privacy", min: 1, max: 5 },
        { type: "scale", name: "importance_access", min: 1, max: 5 },
        { type: "scale", name: "importance_validation", min: 1, max: 5 },
      ],
    },
    {
      legend: "Section D: AI Diagnostic Platform Interest",
      items: [
        { type: "checkboxGroup", name: "ai_interest", options: [
          { id: "ai_very", label: "Very interested" },
          { id: "ai_somewhat", label: "Somewhat interested" },
          { id: "ai_neutral", label: "Neutral" },
          { id: "ai_uninterested", label: "Somewhat uninterested" },
          { id: "ai_not", label: "Not interested at all" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "ai_concerns", options: [
          { id: "conc_accuracy", label: "Accuracy compared to human doctors" },
          { id: "conc_privacy", label: "Privacy and data security" },
          { id: "conc_human", label: "Lack of human interaction" },
          { id: "conc_insurance", label: "Insurance coverage/acceptance" },
          { id: "conc_reliability", label: "Technology reliability" },
          { id: "conc_cost", label: "Cost" },
          { id: "conc_regulatory", label: "Legal/regulatory approval" },
          { id: "conc_misdx", label: "Potential for misdiagnosis" },
          { id: "conc_none", label: "No major concerns" },
        ], allowOther: true },
        { type: "checkboxGroup", name: "willing_to_pay", options: [
          { id: "pay_0_50", label: "€0-€50" },
          { id: "pay_51_100", label: "€51-€100" },
          { id: "pay_101_200", label: "€101-€200" },
          { id: "pay_201_300", label: "€201-€300" },
          { id: "pay_301_500", label: "€301-€500" },
          { id: "pay_gt_500", label: "More than €500" },
          { id: "pay_insurance", label: "Only if covered by insurance" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "voice_comfort", options: [
          { id: "voice_very", label: "Very comfortable" },
          { id: "voice_somewhat", label: "Somewhat comfortable" },
          { id: "voice_neutral", label: "Neutral" },
          { id: "voice_uncomfortable", label: "Somewhat uncomfortable" },
          { id: "voice_very_uncomfortable", label: "Very uncomfortable" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "video_comfort", options: [
          { id: "video_very", label: "Very comfortable" },
          { id: "video_somewhat", label: "Somewhat comfortable" },
          { id: "video_neutral", label: "Neutral" },
          { id: "video_uncomfortable", label: "Somewhat uncomfortable" },
          { id: "video_very_uncomfortable", label: "Very uncomfortable" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "lang_importance", options: [
          { id: "lang_essential", label: "Essential" },
          { id: "lang_very", label: "Very important" },
          { id: "lang_somewhat", label: "Somewhat important" },
          { id: "lang_not", label: "Not important" },
          { id: "lang_english", label: "I prefer English" },
        ], maxSelections: 1 },
      ],
    },
    {
      legend: "Section E: Platform Features & Preferences",
      items: [
        { type: "checkboxGroup", name: "time_willing", options: [
          { id: "time_10_15", label: "10-15 minutes" },
          { id: "time_16_30", label: "16-30 minutes" },
          { id: "time_31_45", label: "31-45 minutes" },
          { id: "time_46_60", label: "46-60 minutes" },
          { id: "time_gt_60", label: "More than 60 minutes" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "features_top", options: [
          { id: "feat_fast", label: "Fast results (within 24 hours)" },
          { id: "feat_reason", label: "Detailed explanation of diagnosis reasoning" },
          { id: "feat_monitor", label: "Follow-up monitoring tools" },
          { id: "feat_treatment", label: "Treatment recommendations" },
          { id: "feat_clinician", label: "Connection to human clinicians for validation" },
          { id: "feat_progress", label: "Progress tracking over time" },
          { id: "feat_edu", label: "Educational resources about ADHD" },
        ] },
        { type: "checkboxGroup", name: "human_review", options: [
          { id: "review_essential", label: "Essential - wouldn't trust AI alone" },
          { id: "review_very", label: "Very important" },
          { id: "review_somewhat", label: "Somewhat important" },
          { id: "review_not_very", label: "Not very important" },
          { id: "review_not", label: "Not important - trust AI completely" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "ongoing_interest", options: [
          { id: "ongoing_very", label: "Very interested" },
          { id: "ongoing_somewhat", label: "Somewhat interested" },
          { id: "ongoing_neutral", label: "Neutral" },
          { id: "ongoing_not", label: "Not interested" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "results_preference", options: [
          { id: "res_online", label: "Immediate online results" },
          { id: "res_email", label: "Email report within 24 hours" },
          { id: "res_video", label: "Video call with clinician" },
          { id: "res_mail", label: "Detailed written report by mail" },
          { id: "res_combo", label: "Combination of digital and human consultation" },
        ], maxSelections: 1 },
      ],
    },
    {
      legend: "Section F: Trust & Validation",
      items: [
        { type: "heading", text: "F1. Trust factors (1-5)" },
        { type: "scale", name: "trust_studies", min: 1, max: 5 },
        { type: "scale", name: "trust_ce", min: 1, max: 5 },
        { type: "scale", name: "trust_university", min: 1, max: 5 },
        { type: "scale", name: "trust_reviews", min: 1, max: 5 },
        { type: "scale", name: "trust_transparency", min: 1, max: 5 },
        { type: "scale", name: "trust_insurance", min: 1, max: 5 },
        { type: "checkboxGroup", name: "convince_to_try", options: [
          { id: "conv_doctor", label: "Recommendation from my doctor" },
          { id: "conv_reviews", label: "Positive reviews from other patients" },
          { id: "conv_research", label: "Published research showing accuracy" },
          { id: "conv_cost", label: "Lower cost than traditional diagnosis" },
          { id: "conv_speed", label: "Faster results" },
          { id: "conv_privacy", label: "Privacy/anonymity" },
          { id: "conv_trial", label: "Free trial or money-back guarantee" },
          { id: "conv_coverage", label: "Insurance coverage" },
        ] },
      ],
    },
    {
      legend: "Section G: Data Privacy & Sharing",
      items: [
        { type: "checkboxGroup", name: "privacy_concern", options: [
          { id: "priv_very", label: "Very concerned" },
          { id: "priv_somewhat", label: "Somewhat concerned" },
          { id: "priv_neutral", label: "Neutral" },
          { id: "priv_not_very", label: "Not very concerned" },
          { id: "priv_not", label: "Not concerned at all" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "share_data", options: [
          { id: "share_yes", label: "Yes, definitely" },
          { id: "share_strict", label: "Yes, with strict privacy controls" },
          { id: "share_maybe", label: "Maybe, depending on details" },
          { id: "share_prob_no", label: "Probably not" },
          { id: "share_no", label: "Definitely not" },
        ], maxSelections: 1 },
        { type: "checkboxGroup", name: "storage_preference", options: [
          { id: "store_local", label: "Locally on my device only" },
          { id: "store_eu", label: "European servers with GDPR compliance" },
          { id: "store_provider", label: "My healthcare provider's system" },
          { id: "store_cloud", label: "Secure cloud with encryption" },
          { id: "store_dont_care", label: "Don't care as long as it's secure" },
        ], maxSelections: 1 },
      ],
    },
    {
      legend: "Section H: Final Questions",
      items: [
        { type: "textarea", name: "improvement", placeholder: "Your response" },
        { type: "textarea", name: "additional_comments", placeholder: "Your response" },
        { type: "checkboxGroup", name: "beta_interest", options: [
          { id: "beta_yes", label: "Yes, very interested" },
          { id: "beta_maybe", label: "Maybe, depending on details" },
          { id: "beta_no", label: "No, not interested" },
        ], maxSelections: 1 },
        { type: "input", name: "contact_email", inputType: "email", placeholder: "Email (optional)" },
      ],
    },
  ],
  catalog: {
    age: { ui_question_id: "A1", question_text: "Age", options: { age_18_24: "18-24", age_25_34: "25-34", age_35_44: "35-44", age_45_54: "45-54", age_55_64: "55-64", age_65_plus: "65+" } },
    gender: { ui_question_id: "A2", question_text: "Gender", options: { gender_female: "Female", gender_male: "Male", gender_nb: "Non-binary", gender_na: "Prefer not to say" } },
    country: { ui_question_id: "A3", question_text: "Country of residence", options: { country_at: "Austria", country_de: "Germany", country_ch: "Switzerland" } },
    language: { ui_question_id: "A4", question_text: "Primary language", options: { lang_de: "German", lang_en: "English" } },
    education: { ui_question_id: "A5", question_text: "Education level", options: { edu_lt_hs: "Less than high school", edu_hs: "High school diploma", edu_some_college: "Some college/university", edu_bachelor: "Bachelor's degree", edu_master_plus: "Master's degree or higher" } },
    employment: { ui_question_id: "A6", question_text: "Employment status", options: { emp_ft: "Employed full-time", emp_pt: "Employed part-time", emp_self: "Self-employed", emp_student: "Student", emp_unemployed: "Unemployed", emp_retired: "Retired" } },
    income: { ui_question_id: "A7", question_text: "Annual household income (EUR)", options: { inc_lt_25k: "Under €25,000", inc_25_45: "€25,000-€45,000", inc_45_65: "€45,000-€65,000", inc_65_85: "€65,000-€85,000", inc_gt_85k: "Over €85,000", inc_na: "Prefer not to say" } },

    adhd_status: { ui_question_id: "B1", question_text: "ADHD diagnosis status", options: { adhd_dx: "Officially diagnosed with ADHD", adhd_self: "Self-diagnosed/suspect ADHD but not formally diagnosed", adhd_considering: "Considering evaluation for ADHD", adhd_none: "No ADHD diagnosis or suspicion", adhd_caregiver: "Parent/caregiver of someone with/suspected ADHD" } },
    adhd_type: { ui_question_id: "B2", question_text: "If you have been diagnosed, what type?", options: { type_inattentive: "ADHD - Inattentive type", type_hyper: "ADHD - Hyperactive/Impulsive type", type_combined: "ADHD - Combined type", type_unsure: "Not sure/don't remember", type_na: "Not applicable" } },
    age_dx: { ui_question_id: "B3", question_text: "Age when first diagnosed (if applicable)", options: { age_u12: "Under 12", age_12_17: "12-17", age_18_25: "18-25", age_26_35: "26-35", age_36_45: "36-45", age_45p: "Over 45", age_na: "Not applicable" } },

    time_to_dx: { ui_question_id: "C1", question_text: "How long did it take from first seeking help to receiving an ADHD diagnosis?", options: { t_lt_1m: "Less than 1 month", t_1_3m: "1-3 months", t_4_6m: "4-6 months", t_7_12m: "7-12 months", t_1_2y: "1-2 years", t_gt_2y: "More than 2 years", t_waiting: "Still waiting for diagnosis", t_na: "Not applicable" } },
    num_specialists: { ui_question_id: "C2", question_text: "How many healthcare professionals did you see before receiving your diagnosis?", options: { sp_1: "1", sp_2_3: "2-3", sp_4_5: "4-5", sp_6_8: "6-8", sp_gt_8: "More than 8", sp_na: "Not applicable" } },
    oop_cost: { ui_question_id: "C3", question_text: "Total out-of-pocket cost for ADHD diagnostic process (EUR)", options: { cost_0: "€0 (fully covered by insurance)", cost_1_200: "€1-€200", cost_201_500: "€201-€500", cost_501_1000: "€501-€1,000", cost_1001_2000: "€1,001-€2,000", cost_gt_2000: "More than €2,000", cost_unsure: "Not sure/don't remember" } },
    satisfaction: { ui_question_id: "C4", question_text: "Rate your satisfaction with the current ADHD diagnostic process", options: { sat_1: "1 - Very dissatisfied", sat_2: "2 - Dissatisfied", sat_3: "3 - Neutral", sat_4: "4 - Satisfied", sat_5: "5 - Very satisfied", sat_na: "Not applicable" } },
    barriers: { ui_question_id: "C5", question_text: "Which barriers did you experience during diagnosis?", options: { bar_wait: "Long waiting times for appointments", bar_cost: "High cost/poor insurance coverage", bar_find: "Difficulty finding qualified specialists", bar_dismiss: "Dismissive or uninformed healthcare providers", bar_stigma: "Stigma/embarrassment", bar_distance: "Geographic distance to specialists", bar_lang: "Language barriers", bar_minimized: "Feeling that symptoms were minimized", bar_bias: "Bias related to gender/age/background", bar_paper: "Complex paperwork/bureaucracy" } },
    importance_speed: { ui_question_id: "C6", question_text: "Speed of diagnosis" },
    importance_cost: { ui_question_id: "C6", question_text: "Cost affordability" },
    importance_accuracy: { ui_question_id: "C6", question_text: "Accuracy" },
    importance_privacy: { ui_question_id: "C6", question_text: "Privacy/confidentiality" },
    importance_access: { ui_question_id: "C6", question_text: "Convenience/accessibility" },
    importance_validation: { ui_question_id: "C6", question_text: "Professional validation" },

    ai_interest: { ui_question_id: "D1", question_text: "AI platform interest", options: { ai_very: "Very interested", ai_somewhat: "Somewhat interested", ai_neutral: "Neutral", ai_uninterested: "Somewhat uninterested", ai_not: "Not interested at all" } },
    ai_concerns: { ui_question_id: "D2", question_text: "Primary concerns about AI-assisted ADHD diagnosis?", options: { conc_accuracy: "Accuracy compared to human doctors", conc_privacy: "Privacy and data security", conc_human: "Lack of human interaction", conc_insurance: "Insurance coverage/acceptance", conc_reliability: "Technology reliability", conc_cost: "Cost", conc_regulatory: "Legal/regulatory approval", conc_misdx: "Potential for misdiagnosis", conc_none: "No major concerns" } },
    willing_to_pay: { ui_question_id: "D3", question_text: "Willingness to pay for assessment", options: { pay_0_50: "€0-€50", pay_51_100: "€51-€100", pay_101_200: "€101-€200", pay_201_300: "€201-€300", pay_301_500: "€301-€500", pay_gt_500: "More than €500", pay_insurance: "Only if covered by insurance" } },
    voice_comfort: { ui_question_id: "D4", question_text: "Comfort providing speech/voice samples", options: { voice_very: "Very comfortable", voice_somewhat: "Somewhat comfortable", voice_neutral: "Neutral", voice_uncomfortable: "Somewhat uncomfortable", voice_very_uncomfortable: "Very uncomfortable" } },
    video_comfort: { ui_question_id: "D5", question_text: "Comfort providing video recordings", options: { video_very: "Very comfortable", video_somewhat: "Somewhat comfortable", video_neutral: "Neutral", video_uncomfortable: "Somewhat uncomfortable", video_very_uncomfortable: "Very uncomfortable" } },
    lang_importance: { ui_question_id: "D6", question_text: "Importance of German availability", options: { lang_essential: "Essential", lang_very: "Very important", lang_somewhat: "Somewhat important", lang_not: "Not important", lang_english: "I prefer English" } },

    time_willing: { ui_question_id: "E1", question_text: "How long would you be willing to spend on an AI diagnostic assessment?", options: { time_10_15: "10-15 minutes", time_16_30: "16-30 minutes", time_31_45: "31-45 minutes", time_46_60: "46-60 minutes", time_gt_60: "More than 60 minutes" } },
    features_top: { ui_question_id: "E2", question_text: "Which features would be most valuable to you?" },
    human_review: { ui_question_id: "E3", question_text: "Importance that a human clinician reviews AI diagnosis", options: { review_essential: "Essential - wouldn't trust AI alone", review_very: "Very important", review_somewhat: "Somewhat important", review_not_very: "Not very important", review_not: "Not important - trust AI completely" } },
    ongoing_interest: { ui_question_id: "E4", question_text: "Interest in ongoing ADHD symptom monitoring", options: { ongoing_very: "Very interested", ongoing_somewhat: "Somewhat interested", ongoing_neutral: "Neutral", ongoing_not: "Not interested" } },
    results_preference: { ui_question_id: "E5", question_text: "How would you prefer to receive your diagnostic results?", options: { res_online: "Immediate online results", res_email: "Email report within 24 hours", res_video: "Video call with clinician", res_mail: "Detailed written report by mail", res_combo: "Combination of digital and human consultation" } },

    trust_studies: { ui_question_id: "F1", question_text: "Clinical validation studies" },
    trust_ce: { ui_question_id: "F1", question_text: "Regulatory approval (CE marking)" },
    trust_university: { ui_question_id: "F1", question_text: "University partnerships" },
    trust_reviews: { ui_question_id: "F1", question_text: "Peer reviews/testimonials" },
    trust_transparency: { ui_question_id: "F1", question_text: "Transparency about AI decision-making" },
    trust_insurance: { ui_question_id: "F1", question_text: "Insurance company acceptance" },
    convince_to_try: { ui_question_id: "F2", question_text: "What would convince you to try an AI diagnostic platform?" },

    privacy_concern: { ui_question_id: "G1", question_text: "Concern about privacy of health data" },
    share_data: { ui_question_id: "G2", question_text: "Willingness to share anonymized diagnostic data" },
    storage_preference: { ui_question_id: "G3", question_text: "Preferred data storage" },

    improvement: { ui_question_id: "H1", question_text: "Most important improvement needed in ADHD diagnosis today" },
    additional_comments: { ui_question_id: "H2", question_text: "Additional comments about AI-powered ADHD diagnostics" },
    beta_interest: { ui_question_id: "H3", question_text: "Interest in participating in beta test" },
    contact_email: { ui_question_id: "H4", question_text: "Contact information (Optional: Email)" },
  },
};

export default function UserSurveyPage() {
  return (
    <PageShell>
      <Container>
        <Hero
          title={
            <>
              <GradientText>ANQA</GradientText> User Survey
            </>
          }
          subtitle="AI-Powered ADHD Diagnostics: User Perspectives"
        />
        <div className="mx-auto mt-4 max-w-3xl space-y-6">
          <SurveyIntroCard estimated="8–12 minutes" incentive="Participants have the option to enter a drawing for €50 Amazon vouchers (1 in 20 chance)." />

          <InfoCard title="Introduction">
            <p>
              We are developing an innovative AI-powered platform to improve ADHD diagnosis accessibility and accuracy.
              Your insights will help us create a solution that truly meets user needs. All responses are confidential
              and anonymous.
            </p>
          </InfoCard>
        </div>

        <SurveyUiSettingsProvider showUiQuestionIds={false}>
          <DynamicSurvey surveyId={definition.id} inlineDefinition={definition} autoRestorePlacement="top" />
        </SurveyUiSettingsProvider>
      </Container>
    </PageShell>
  );
}


