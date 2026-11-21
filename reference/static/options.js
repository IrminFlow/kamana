(() => {
  const cityExtras = {
    "Andaman and Nicobar Islands": ["Port Blair"], "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Kurnool", "Rajahmundry", "Kakinada"],
    "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang"], "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia"], "Chandigarh": ["Chandigarh"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg"], "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
    "Delhi": ["New Delhi", "Delhi"], "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa"], "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar", "Junagadh"],
    "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar", "Rohtak", "Hansi", "Bahadurgarh"], "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Kullu"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"], "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar"],
    "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Kalaburagi", "Shivamogga", "Tumakuru"], "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Kottayam"],
    "Ladakh": ["Leh", "Kargil"], "Lakshadweep": ["Kavaratti"], "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Rewa"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Chhatrapati Sambhajinagar", "Navi Mumbai", "Kolhapur", "Solapur"],
    "Manipur": ["Imphal", "Thoubal", "Churachandpur"], "Meghalaya": ["Shillong", "Tura", "Jowai"], "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
    "Nagaland": ["Kohima", "Dimapur", "Mokokchung"], "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri"],
    "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"], "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Jaisalmer"], "Sikkim": ["Gangtok", "Namchi", "Gyalshing"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode", "Vellore", "Tirunelveli"],
    "Telangana": ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"], "Tripura": ["Agartala", "Udaipur", "Dharmanagar"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Ghaziabad", "Noida", "Meerut", "Bareilly", "Gorakhpur"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Haldwani", "Roorkee"], "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol", "Bardhaman"]
  };

  const districtOverrides = {
    "Andhra Pradesh": ["Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya", "Bapatla", "Chittoor", "Dr. B.R. Ambedkar Konaseema", "East Godavari", "Eluru", "Guntur", "Kakinada", "Krishna", "Kurnool", "Markapuram", "Nandyal", "Ntr", "Palnadu", "Parvathipuram Manyam", "Polavaram", "Prakasam", "Sri Potti Sriramulu Nellore", "Sri Sathya Sai", "Srikakulam", "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", "Y.S.R. Kadapa"],
    "Arunachal Pradesh": ["Anjaw", "Bichom", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Keyi Panyor", "Kra Daadi", "Kurung Kumey", "Leparada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
    "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hansi", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
    "Madhya Pradesh": ["Agar-Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Maihar", "Mauganj", "Mandla", "Mandsaur", "Morena", "Narmadapuram", "Narsinghpur", "Neemuch", "Niwari", "Pandhurna", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
    "Maharashtra": ["Ahilyanagar", "Akola", "Amravati", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Chhatrapati Sambhajinagar", "Dharashiv", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"]
  };
  const removedDistricts = {
    "Rajasthan": ["Anupgarh", "Dudu", "Gangapur City", "Jaipur Rural", "Jodhpur Rural", "Kekri", "Neem Ka Thana", "Sanchore", "Shahpura"],
    "Madhya Pradesh": ["Hoshangabad"],
    "Maharashtra": ["Ahmednagar", "Aurangabad", "Osmanabad", "Mumbai City"]
  };
  const fill = (select, values, placeholder) => {
    select.replaceChildren(new Option(placeholder, ""));
    values.forEach(value => select.add(new Option(value, value)));
  };
  const initOtp = () => document.querySelectorAll(".form-card").forEach(form => {
    if (!form.querySelector("[data-send-otp]")) return;
    const phone = form.querySelector('[name="phone"]');
    const code = form.querySelector("[data-otp-code]");
    const message = form.querySelector("[data-otp-message]");
    const csrf = form.querySelector('[name="csrf"]').value;
    const send = form.querySelector("[data-send-otp]");
    const submit = form.querySelector('button[type="submit"]');
    const call = async (path, body) => {
      message.textContent = "Please wait… / कृपया प्रतीक्षा करें…";
      try {
        const response = await fetch(path, {method:"POST", headers:{"Content-Type":"application/json", "X-CSRF-Token":csrf}, body:JSON.stringify(body)});
        const data = await response.json();
        const hindi = {
          "A verification code has been sent by SMS.": "SMS से सत्यापन कोड भेज दिया गया है।",
          "Mobile number verified.": "मोबाइल नंबर सत्यापित हो गया है।",
          "Please wait a minute before requesting another code.": "दूसरा कोड मांगने से पहले एक मिनट प्रतीक्षा करें।",
          "Too many code requests. Please try again later.": "बहुत बार कोड मांगा गया है। कृपया बाद में फिर प्रयास करें।",
          "Request a code for this number, then enter it here.": "इस नंबर के लिए कोड मंगाएँ, फिर उसे यहाँ दर्ज करें।",
          "That code was not accepted. Check it and try again.": "यह कोड स्वीकार नहीं हुआ। जाँचकर फिर प्रयास करें।",
          "Please try again.": "कृपया फिर से प्रयास करें।",
          "The SMS provider could not complete this request. Please try again.": "SMS सेवा यह अनुरोध पूरा नहीं कर सकी। कृपया फिर प्रयास करें।",
          "We could not reach the SMS service. Please try again shortly.": "SMS सेवा से संपर्क नहीं हो सका। कृपया थोड़ी देर बाद प्रयास करें।",
          "Verification could not be completed. Please try again.": "सत्यापन पूरा नहीं हो सका। कृपया फिर प्रयास करें।"
        };
        const text = data.message || "Please try again.";
        message.textContent = `${text} / ${hindi[text] || "कृपया ऊपर दिए निर्देश के अनुसार फिर प्रयास करें।"}`;
        if (!response.ok || !data.ok) message.dataset.state = "error"; else message.dataset.state = "ok";
        return response.ok && !!data.ok;
      } catch (_) { message.textContent = "Could not connect. Please try again. / संपर्क नहीं हो सका। कृपया फिर प्रयास करें।"; message.dataset.state = "error"; return false; }
    };
    send.addEventListener("click", () => call("/send-otp", {phone:phone.value}));
    form.addEventListener("submit", async event => {
      if (form.dataset.otpVerified === "true") return;
      event.preventDefault();
      if (form.dataset.otpSubmitting === "true") return;
      form.dataset.otpSubmitting = "true";
      if (submit) submit.disabled = true;
      const verified = await call("/verify-otp", {phone:phone.value, code:code.value});
      if (verified) {
        form.dataset.otpVerified = "true";
        HTMLFormElement.prototype.submit.call(form);
        return;
      }
      delete form.dataset.otpSubmitting;
      if (submit) submit.disabled = false;
      code.focus();
    });
    [phone, code].forEach(input => input.addEventListener("input", () => {
      delete form.dataset.otpVerified;
      message.textContent = "";
      message.dataset.state = "";
    }));
  });
  const initForms = (states, tradeJobs) => document.querySelectorAll("form").forEach(form => {
    const stateSelect = form.querySelector("[data-state]"), citySelect = form.querySelector("[data-city]"), tradeSelect = form.querySelector("[data-trade]"), jobSelect = form.querySelector("[data-job]");
    if (!stateSelect || !citySelect || !tradeSelect || !jobSelect) return;
    const stateWanted = new URLSearchParams(location.search).get("state") || "";
    const allJobs = [...new Set(Object.values(tradeJobs || {}).flat().filter(job => job !== "Other / अन्य (type manually / स्वयं लिखें)"))].sort((a, b) => a.localeCompare(b));
    const cityWanted = new URLSearchParams(location.search).get("city") || "";
    const tradeWanted = new URLSearchParams(location.search).get("trade") || "";
    const jobWanted = new URLSearchParams(location.search).get("job") || "";
    const otherState = Object.keys(states);
    fill(stateSelect, otherState, "Choose a state / राज्य चुनें");
    const tradeOptions = Object.keys(tradeJobs || {}).filter(trade => !trade.toLowerCase().startsWith("other")).sort((a, b) => a.localeCompare(b));
    fill(tradeSelect, tradeOptions, "Choose a trade / व्यवसाय चुनें");
    tradeSelect.add(new Option("Other / अन्य (type manually / स्वयं लिखें)", "__OTHER_TRADE__"));
    const stateOther = document.createElement("label");
    stateOther.className = "conditional";
    stateOther.innerHTML = 'Enter state / UT<input name="state_other" maxlength="100" placeholder="Type your state">';
    stateSelect.closest("label").insertAdjacentElement("afterend", stateOther);
    stateSelect.add(new Option("Other / अन्य (type manually / स्वयं लिखें)", "__OTHER_STATE__"));
    const stateOtherInput = stateOther.querySelector("input");
    const modeInput = form.querySelector("[data-location-mode]");
    const cityOtherWrap = form.querySelector("[data-city-other-wrap]");
    const pinWrap = form.querySelector("[data-pincode-wrap]");
    const jobOtherWrap = form.querySelector("[data-job-other-wrap]");
    const tradeOtherWrap = form.querySelector("[data-trade-other-wrap]");
    const tradeOtherInput = tradeOtherWrap && tradeOtherWrap.querySelector("input");
    const show = (element, yes) => { if (element) element.classList.toggle("show", !!yes); };
    const stateChanged = () => {
      const value = stateSelect.value;
      if (stateOtherInput) { show(stateOther, value === "__OTHER_STATE__"); stateOtherInput.required = value === "__OTHER_STATE__"; }
      const options = states[value] || [];
      citySelect.replaceChildren(new Option(options.length ? "Choose a city / शहर चुनें" : "Choose a state first / पहले राज्य चुनें", ""));
      options.forEach(city => citySelect.add(new Option(city, city)));
      if (value) { citySelect.add(new Option("Search by PIN code / पिन कोड से खोजें", "__PIN__")); citySelect.add(new Option("Other / अन्य (type manually / स्वयं लिखें)", "__OTHER__")); }
      citySelect.value = cityWanted && options.includes(cityWanted) ? cityWanted : "";
      if (cityWanted === "__OTHER__") citySelect.value = cityWanted;
      locationChanged();
    };
    const locationChanged = () => {
      const value = citySelect.value, isOther = value === "__OTHER__", isPin = value === "__PIN__";
      if (modeInput) modeInput.value = isPin ? "pincode" : "city";
      show(cityOtherWrap, isOther);
      show(pinWrap, isPin);
      const cityOtherInput = cityOtherWrap && cityOtherWrap.querySelector("input");
      const pinInput = pinWrap && pinWrap.querySelector("input");
      if (cityOtherInput) cityOtherInput.required = isOther;
      if (pinInput) pinInput.required = isPin;
    };
    const jobChanged = () => {
      const isOther = jobSelect.value === "Other / अन्य (type manually / स्वयं लिखें)" || jobSelect.value === "__OTHER__";
      if (isOther) jobSelect.value = "__OTHER__";
      show(jobOtherWrap, isOther);
      const input = jobOtherWrap && jobOtherWrap.querySelector("input");
      if (input) input.required = isOther;
    };
    const tradeChanged = () => {
      const isOther = tradeSelect.value === "__OTHER_TRADE__";
      show(tradeOtherWrap, isOther);
      if (tradeOtherInput) tradeOtherInput.required = isOther;
      fill(jobSelect, allJobs, "Choose a job profile / कार्य-प्रोफ़ाइल चुनें (optional / वैकल्पिक)");
      jobSelect.add(new Option("Other / अन्य (type manually / स्वयं लिखें)", "__OTHER__"));
      if (jobWanted && allJobs.includes(jobWanted)) jobSelect.value = jobWanted;
      else if (jobWanted === "__OTHER__") jobSelect.value = "__OTHER__";
      jobChanged();
    };
    stateSelect.addEventListener("change", stateChanged);
    citySelect.addEventListener("change", locationChanged);
    tradeSelect.addEventListener("change", tradeChanged);
    jobSelect.addEventListener("change", jobChanged);
    if (form.classList.contains("search-box")) form.addEventListener("submit", event => {
      tradeSelect.setCustomValidity("");
      if (!tradeSelect.value && !jobSelect.value) {
        event.preventDefault();
        tradeSelect.setCustomValidity("Choose a trade or job profile to search.");
        tradeSelect.reportValidity();
      }
    });
    tradeSelect.addEventListener("change", () => tradeSelect.setCustomValidity(""));
    jobSelect.addEventListener("change", () => tradeSelect.setCustomValidity(""));
    if (stateWanted) stateSelect.value = stateWanted;
    stateChanged();
    if (tradeWanted) tradeSelect.value = tradeWanted === "__OTHER_TRADE__" ? "__OTHER_TRADE__" : tradeWanted;
    tradeChanged();
    const cityOtherValue = new URLSearchParams(location.search).get("city_other");
    const pinValue = new URLSearchParams(location.search).get("pincode");
    const stateOtherValue = new URLSearchParams(location.search).get("state_other");
    const jobOtherValue = new URLSearchParams(location.search).get("job_other");
    const tradeOtherValue = new URLSearchParams(location.search).get("trade_other");
    if (cityOtherValue && cityOtherWrap) cityOtherWrap.querySelector("input").value = cityOtherValue;
    if (pinValue && pinWrap) pinWrap.querySelector("input").value = pinValue;
    if (stateOtherValue) stateOtherInput.value = stateOtherValue;
    if (jobOtherValue && jobOtherWrap) jobOtherWrap.querySelector("input").value = jobOtherValue;
    if (tradeOtherValue && tradeOtherInput) tradeOtherInput.value = tradeOtherValue;
    locationChanged();
  });
  Promise.all([
    fetch("/static/data/india_states_districts.json").then(response => { if (!response.ok) throw new Error("Location data unavailable"); return response.json(); }),
    fetch("/static/data/trades_jobs.json").then(response => { if (!response.ok) throw new Error("Trade data unavailable"); return response.json(); })
  ])
    .then(([data, tradeJobs]) => {
      const districts = Object.fromEntries(data.map(entry => [entry.name, entry.districts.map(district => district.name)]));
      const locations = {};
      Object.keys(cityExtras).forEach(state => {
        const districtsForState = (districts[state] || []).filter(city => !(removedDistricts[state] || []).includes(city));
        if (state === "Chhattisgarh") districtsForState.push("Khairagarh-Chhuikhadan-Gandai");
        const currentDistricts = districtOverrides[state] || districtsForState;
        locations[state] = [...new Set([...currentDistricts, ...cityExtras[state]])].sort((a, b) => a.localeCompare(b));
      });
      initForms(locations, tradeJobs);
      initOtp();
    })
    .catch(() => { initForms(cityExtras, {}); initOtp(); });
})();
