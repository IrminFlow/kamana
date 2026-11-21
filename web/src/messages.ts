/** Hindi for every English message the backend returns (see convex/lib.ts MSG). */
const HINDI: Record<string, string> = {
  "A verification code has been sent by SMS.": "SMS से सत्यापन कोड भेज दिया गया है।",
  "Mobile number verified.": "मोबाइल नंबर सत्यापित हो गया है।",
  "Please wait a minute before requesting another code.": "दूसरा कोड मांगने से पहले एक मिनट प्रतीक्षा करें।",
  "Too many code requests. Please try again later.": "बहुत बार कोड मांगा गया है। कृपया बाद में फिर प्रयास करें।",
  "Request a code for this number, then enter it here.": "इस नंबर के लिए कोड मंगाएँ, फिर उसे यहाँ दर्ज करें।",
  "That code was not accepted. Check it and try again.": "यह कोड स्वीकार नहीं हुआ। जाँचकर फिर प्रयास करें।",
  "Please try again.": "कृपया फिर से प्रयास करें।",
  "The SMS provider could not complete this request. Please try again.": "SMS सेवा यह अनुरोध पूरा नहीं कर सकी। कृपया फिर प्रयास करें।",
  "We could not reach the SMS service. Please try again shortly.": "SMS सेवा से संपर्क नहीं हो सका। कृपया थोड़ी देर बाद प्रयास करें।",
  "Verification could not be completed. Please try again.": "सत्यापन पूरा नहीं हो सका। कृपया फिर प्रयास करें।",
  "Enter a valid 10-digit Indian mobile number.": "भारत का 10 अंकों का सही मोबाइल नंबर दर्ज करें।",
  "A profile already exists for this mobile number. Submitting will replace it.": "इस मोबाइल नंबर से पहले से एक प्रोफ़ाइल है। जमा करने पर वह बदल दी जाएगी।",
  "No profile was found for this mobile number.": "इस मोबाइल नंबर के लिए कोई प्रोफ़ाइल नहीं मिली।",
  "Your profile has been deleted.": "आपकी प्रोफ़ाइल हटा दी गई है।",
  "Too many attempts. Please try again later.": "बहुत अधिक प्रयास हुए। कृपया बाद में फिर प्रयास करें।",
  "Please enter your name.": "कृपया अपना नाम दर्ज करें।",
  "Please choose your state.": "कृपया अपना राज्य चुनें।",
  "Please choose your city.": "कृपया अपना शहर चुनें।",
  "Please enter a valid 6-digit PIN code.": "कृपया 6 अंकों का सही पिन कोड दर्ज करें।",
  "Please choose your job profile.": "कृपया अपनी कार्य-प्रोफ़ाइल चुनें।",
  "Please enter a valid email address.": "कृपया सही ईमेल पता दर्ज करें।",
  "Please wait…": "कृपया प्रतीक्षा करें…",
  "Could not connect. Please try again.": "संपर्क नहीं हो सका। कृपया फिर प्रयास करें।",
};

const FALLBACK = "कृपया ऊपर दिए निर्देश के अनुसार फिर प्रयास करें।";

export const bilingual = (en: string) => `${en} / ${HINDI[en] || FALLBACK}`;
