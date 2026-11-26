// Original kamana.in State → City dropdown logic. Trade / job suggestions live in profession-suggest.ts.
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
  const OTHER = "Other / अन्य (type manually / स्वयं लिखें)";
  const initForms = states => document.querySelectorAll("form").forEach(form => {
    const stateSelect = form.querySelector("[data-state]"), citySelect = form.querySelector("[data-city]");
    if (!stateSelect || !citySelect) return;
    const params = new URLSearchParams(location.search);
    const stateWanted = params.get("state") || "";
    const cityWanted = params.get("city") || "";
    // Each form sets its own prompts: data-placeholder (no state yet) and data-placeholder-ready.
    const statePrompt = stateSelect.dataset.placeholder || "Choose a state / राज्य चुनें";
    const cityPrompt = citySelect.dataset.placeholder || "Choose a state first / पहले राज्य चुनें";
    const cityPromptReady = citySelect.dataset.placeholderReady || "Choose a city / शहर चुनें";
    fill(stateSelect, Object.keys(states), statePrompt);
    const stateOther = document.createElement("label");
    stateOther.className = "conditional";
    stateOther.innerHTML = 'Enter state / UT<input name="state_other" maxlength="100" placeholder="Type your state">';
    stateSelect.closest("label").insertAdjacentElement("afterend", stateOther);
    stateSelect.add(new Option(OTHER, "__OTHER_STATE__"));
    const stateOtherInput = stateOther.querySelector("input");
    const modeInput = form.querySelector("[data-location-mode]");
    const cityOtherWrap = form.querySelector("[data-city-other-wrap]");
    const pinWrap = form.querySelector("[data-pincode-wrap]");
    const show = (element, yes) => { if (element) element.classList.toggle("show", !!yes); };
    const stateChanged = () => {
      const value = stateSelect.value;
      show(stateOther, value === "__OTHER_STATE__");
      stateOtherInput.required = value === "__OTHER_STATE__";
      const options = states[value] || [];
      citySelect.replaceChildren(new Option(options.length ? cityPromptReady : cityPrompt, ""));
      options.forEach(city => citySelect.add(new Option(city, city)));
      if (value) { citySelect.add(new Option("Search by PIN code / पिन कोड से खोजें", "__PIN__")); citySelect.add(new Option(OTHER, "__OTHER__")); }
      citySelect.value = cityWanted && options.includes(cityWanted) ? cityWanted : "";
      if ((cityWanted === "__OTHER__" || cityWanted === "__PIN__") && value) citySelect.value = cityWanted;
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
    stateSelect.addEventListener("change", stateChanged);
    citySelect.addEventListener("change", locationChanged);
    if (stateWanted) stateSelect.value = stateWanted;
    stateChanged();
    const cityOtherValue = params.get("city_other");
    const pinValue = params.get("pincode");
    const stateOtherValue = params.get("state_other");
    if (cityOtherValue && cityOtherWrap) cityOtherWrap.querySelector("input").value = cityOtherValue;
    if (pinValue && pinWrap) pinWrap.querySelector("input").value = pinValue;
    if (stateOtherValue) stateOtherInput.value = stateOtherValue;
    locationChanged();
  });
  fetch("/static/data/india_states_districts.json")
    .then(response => { if (!response.ok) throw new Error("Location data unavailable"); return response.json(); })
    .then(data => {
      const districts = Object.fromEntries(data.map(entry => [entry.name, entry.districts.map(district => district.name)]));
      const locations = {};
      Object.keys(cityExtras).forEach(state => {
        const districtsForState = (districts[state] || []).filter(city => !(removedDistricts[state] || []).includes(city));
        if (state === "Chhattisgarh") districtsForState.push("Khairagarh-Chhuikhadan-Gandai");
        const currentDistricts = districtOverrides[state] || districtsForState;
        locations[state] = [...new Set([...currentDistricts, ...cityExtras[state]])].sort((a, b) => a.localeCompare(b));
      });
      initForms(locations);
    })
    .catch(() => { initForms(cityExtras); });
})();
