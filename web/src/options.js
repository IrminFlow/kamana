import { canonicalProfession, normalizeProfession as normalize, isStitchingQuery, stitchingJobs } from "../../lib/professions";

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
  const initForms = (states, tradeJobs) => document.querySelectorAll("form").forEach(form => {
    const stateSelect = form.querySelector("[data-state]"), citySelect = form.querySelector("[data-city]"), tradeSelect = form.querySelector("[data-trade]"), jobSelect = form.querySelector("[data-job]");
    if (!stateSelect || !citySelect) return;
    const stateWanted = new URLSearchParams(location.search).get("state") || "";
    const allJobs = [...new Set(Object.values(tradeJobs || {}).flat().filter(job => job !== "Other / अन्य (type manually / स्वयं लिखें)"))].sort((a, b) => a.localeCompare(b));
    const cityWanted = new URLSearchParams(location.search).get("city") || "";
    const tradeWanted = new URLSearchParams(location.search).get("trade") || "";
    const jobWanted = new URLSearchParams(location.search).get("job") || "";
    const otherState = Object.keys(states);
    fill(stateSelect, otherState, "");
    const tradeOptions = Object.keys(tradeJobs || {}).filter(trade => !trade.toLowerCase().startsWith("other")).sort((a, b) => a.localeCompare(b));
    if (tradeSelect) {
      fill(tradeSelect, tradeOptions, "Choose a trade / व्यवसाय चुनें");
      tradeSelect.add(new Option("Other / अन्य (type manually / स्वयं लिखें)", "__OTHER_TRADE__"));
    }
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
      citySelect.replaceChildren(new Option(options.length ? "Choose a city / शहर चुनें" : "जहाँ काम करना चाहते हो", ""));
      options.forEach(city => citySelect.add(new Option(city, city)));
      if (value) { citySelect.add(new Option("Search by PIN code / पिन कोड से खोजें", "__PIN__")); citySelect.add(new Option("Other / अन्य (type manually / स्वयं लिखें)", "__OTHER__")); }
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
    const jobChanged = () => {
      if (!jobSelect) return;
      const isOther = jobSelect.value === "Other / अन्य (type manually / स्वयं लिखें)" || jobSelect.value === "__OTHER__";
      if (isOther) jobSelect.value = "__OTHER__";
      show(jobOtherWrap, isOther);
      const input = jobOtherWrap && jobOtherWrap.querySelector("input");
      if (input) input.required = isOther;
    };
    const tradeChanged = () => {
      if (!tradeSelect || !jobSelect) return;
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
    if (tradeSelect) tradeSelect.addEventListener("change", tradeChanged);
    if (jobSelect) jobSelect.addEventListener("change", jobChanged);
    if (form.classList.contains("search-box") && tradeSelect && jobSelect) form.addEventListener("submit", event => {
      tradeSelect.setCustomValidity("");
      if (!tradeSelect.value && !jobSelect.value) {
        event.preventDefault();
        tradeSelect.setCustomValidity("Choose a trade or job profile to search.");
        tradeSelect.reportValidity();
      }
    });
    if (tradeSelect) tradeSelect.addEventListener("change", () => tradeSelect.setCustomValidity(""));
    if (jobSelect) jobSelect.addEventListener("change", () => jobSelect.setCustomValidity(""));
    if (stateWanted) stateSelect.value = stateWanted;
    stateChanged();
    if (tradeSelect && jobSelect) {
      if (tradeWanted) tradeSelect.value = tradeWanted === "__OTHER_TRADE__" ? "__OTHER_TRADE__" : tradeWanted;
      tradeChanged();
    }
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
  const initSearchAutocomplete = tradeJobs => {
    // Keep one user-facing label for common synonyms. Match searches against
    // the aliases too, so a familiar alternate name still finds the canonical option.
    const excludedEducationTitles = new Set([
      "information technology",
      "multimedia, animation & special effects"
    ]);
    const jobMap = new Map();
    Object.entries(tradeJobs || {}).forEach(([trade, titles]) => {
      (titles || []).forEach(title => {
        if (title.toLowerCase().startsWith("other")) return;
        // The Engineering group contains course/degree names rather than job titles.
        if (trade === "Engineering") return;
        if (excludedEducationTitles.has(normalize(title))) return;
        const canonical = canonicalProfession(title);
        const key = normalize(canonical);
        const existing = jobMap.get(key) || {value: canonical, type: "Job Profile", aliases: []};
        if (normalize(title) !== key && !existing.aliases.includes(title)) existing.aliases.push(title);
        jobMap.set(key, existing);
      });
    });
    const jobs = [...jobMap.values()];
    if (!jobMap.has("sampling master (tailor)")) jobs.push({value:"Sampling Master (Tailor)", type:"Job Profile", aliases:[]});
    const trades = Object.keys(tradeJobs || {}).filter(trade => !trade.toLowerCase().startsWith("other"));
    const catalog = [...jobs, ...trades.map(value => ({value, type:"Trade", aliases:[]}))];
    document.querySelectorAll("form [data-profession-search]").forEach(input => {
      const form = input.closest("form"), list = document.getElementById(input.getAttribute("aria-controls"));
      if (!form || !list) return;
      let shown = [], active = -1;
      const close = () => { list.hidden = true; list.replaceChildren(); input.setAttribute("aria-expanded", "false"); shown = []; active = -1; };
      const choose = item => { input.value = item.value; close(); input.focus(); };
      const setActive = index => {
        active = index;
        [...list.querySelectorAll("[role=option]")].forEach((option, i) => {
          option.setAttribute("aria-selected", i === active ? "true" : "false");
          if (i === active) option.scrollIntoView({block:"nearest"});
        });
      };
      const render = () => {
        const query = normalize(input.value);
        if (!query) return close();
        const direct = catalog.filter(item => normalize(item.value).includes(query) || item.aliases.some(alias => normalize(alias).includes(query)));
        const related = isStitchingQuery(query) ? stitchingJobs.map(value => ({value, type:"Related job"})) : [];
        shown = [...new Map([...direct, ...related].map(item => [item.value.toLocaleLowerCase(), item])).values()].slice(0, 8);
        list.replaceChildren();
        if (!shown.length) return close();
        shown.forEach((item, index) => {
          const option = document.createElement("button");
          option.type = "button"; option.className = "profession-suggestion"; option.setAttribute("role", "option"); option.setAttribute("aria-selected", "false");
          const name = document.createElement("span"); name.textContent = item.value;
          const kind = document.createElement("small"); kind.textContent = item.type;
          option.append(name, kind);
          option.addEventListener("mousedown", event => event.preventDefault());
          option.addEventListener("click", () => choose(item));
          list.append(option);
          if (index === 0) setActive(-1);
        });
        list.hidden = false; input.setAttribute("aria-expanded", "true");
      };
      if (form.classList.contains("search-box")) input.value = new URLSearchParams(location.search).get("q") || input.value;
      input.addEventListener("input", render);
      input.addEventListener("keydown", event => {
        if (list.hidden) return;
        if (event.key === "ArrowDown") { event.preventDefault(); setActive(Math.min(active + 1, shown.length - 1)); }
        else if (event.key === "ArrowUp") { event.preventDefault(); setActive(Math.max(active - 1, 0)); }
        else if (event.key === "Enter" && active >= 0) { event.preventDefault(); choose(shown[active]); }
        else if (event.key === "Escape") close();
      });
      form.addEventListener("submit", close);
      document.addEventListener("click", event => { if (!form.contains(event.target)) close(); });
    });
  };
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
      initSearchAutocomplete(tradeJobs);

    })
    .catch(() => { initForms(cityExtras, {}); initSearchAutocomplete({}); });
})();
