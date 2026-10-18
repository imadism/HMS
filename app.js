/* ==========================================================================
   GrandStay PMS & Travel Suite - Complete Application Logic Engine
   ========================================================================== */

(function () {
  'use strict';

  // State Store Key
  const STORAGE_KEY = 'grandstay_pms_app_state_v3';

  class CloudStore {
    constructor() {
      const config = window.SUPABASE_CONFIG || {};
      this.ready = Boolean(window.supabase && config.url && config.publishableKey && !config.url.startsWith('PASTE_'));
      this.client = this.ready ? window.supabase.createClient(config.url, config.publishableKey) : null;
      this.organizationId = null;
      this.role = null;
      this.user = null;
    }
    async signIn(email, password) {
      const { error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
    async signOut() { await this.client.auth.signOut(); }
    async loadIdentity() {
      const { data: { user } } = await this.client.auth.getUser();
      this.user = user;
      if (!user) return null;
      const { data, error } = await this.client.from('organization_members').select('organization_id, role').eq('user_id', user.id).limit(1).maybeSingle();
      if (error) throw error;
      this.organizationId = data?.organization_id || null;
      this.role = data?.role || null;
      return data;
    }
    async createOrganization(name) {
      const { data, error } = await this.client.rpc('create_organization', { organization_name: name });
      if (error) throw error;
      this.organizationId = data;
      this.role = 'Administrator';
    }
    async loadState() {
      const { data, error } = await this.client.from('app_workspaces').select('state').eq('organization_id', this.organizationId).single();
      if (error) throw error;
      return data.state;
    }
    async saveState(state) {
      const { error } = await this.client.from('app_workspaces').upsert({ organization_id: this.organizationId, state, updated_by: this.user.id }, { onConflict: 'organization_id' });
      if (error) throw error;
    }
  }

  // Master World Nationalities List
  const DEFAULT_NATIONALITIES = [
    'Saudi Arabia', 'United Arab Emirates', 'Kuwait', 'Qatar', 'Oman', 'Bahrain',
    'Egypt', 'United Kingdom', 'United States', 'Indonesia', 'Malaysia', 'Pakistan',
    'India', 'Turkey', 'France', 'Germany', 'Algeria', 'Morocco', 'Tunisia',
    'Jordan', 'Lebanon', 'Iraq', 'Syria', 'Yemen', 'Sudan', 'Libya',
    'Canada', 'Australia', 'China', 'Japan', 'South Korea', 'Singapore',
    'South Africa', 'Nigeria', 'Kenya', 'Uzbekistan', 'Kazakhstan', 'Bangladesh'
  ];

  // Default Pre-populated Master Data
  const DEFAULT_STATE = {
    activeUserId: 'USR-1', // Default to Administrator
    nationalities: DEFAULT_NATIONALITIES,
    users: [
      { id: 'USR-1', name: 'Manager Operations', username: 'admin.manager', role: 'Administrator', email: 'admin@grandstay.com', status: 'Active' },
      { id: 'USR-2', name: 'Sara Al-Ghamdi', username: 'sara.reservations', role: 'Reservation Agent', email: 'sara@grandstay.com', status: 'Active' },
      { id: 'USR-3', name: 'Faisal Accountant', username: 'faisal.finance', role: 'Accountant', email: 'faisal@grandstay.com', status: 'Active' },
      { id: 'USR-4', name: 'Guest Viewer', username: 'guest.view', role: 'View Only', email: 'guest@grandstay.com', status: 'Active' }
    ],
    hotels: [
      { id: 'HTL-1', name: 'Makkah Clock Royal Tower (Fairmont)', city: 'Makkah', stars: 5, phone: '+966 12 571 7777' },
      { id: 'HTL-2', name: 'Pullman Zamzam Makkah', city: 'Makkah', stars: 5, phone: '+966 12 571 5555' },
      { id: 'HTL-3', name: 'Dar Al Taqwa Hotel Madina', city: 'Madina', stars: 5, phone: '+966 14 829 1111' },
      { id: 'HTL-4', name: 'The Oberoi Madina', city: 'Madina', stars: 5, phone: '+966 14 828 2222' },
      { id: 'HTL-5', name: 'Swissôtel Makkah', city: 'Makkah', stars: 5, phone: '+966 12 571 8000' },
      { id: 'HTL-6', name: 'Anwar Al Madinah M&ouml;venpick', city: 'Madina', stars: 5, phone: '+966 14 818 1000' }
    ],
    clients: [
      { id: 'CLT-1', name: 'Al-Safwa Travel & Tourism', type: 'Travel Agent', nat: 'Saudi Arabia', mobile: '+966 50 123 4567', email: 'booking@alsafwa.com', address: 'Riyadh, KSA' },
      { id: 'CLT-2', name: 'Haramain Global Bookings', type: 'Travel Agent', nat: 'United Arab Emirates', mobile: '+971 50 987 6543', email: 'res@haramain-global.ae', address: 'Dubai, UAE' },
      { id: 'CLT-3', name: 'Elite Umrah Services UK', type: 'Travel Agent', nat: 'United Kingdom', mobile: '+44 20 7946 0912', email: 'info@eliteumrah.co.uk', address: 'London, UK' },
      { id: 'CLT-4', name: 'Sheikh Abdullah Al-Mansoor', type: 'Direct Client', nat: 'Saudi Arabia', mobile: '+966 55 444 3322', email: 'abdullah@almansoor.sa', address: 'Jeddah, KSA' },
      { id: 'CLT-5', name: 'Sultan Travel Agency', type: 'Both', nat: 'Malaysia', mobile: '+60 3 2145 6789', email: 'tours@sultantravel.my', address: 'Kuala Lumpur, MY' }
    ],
    reservations: [
      {
        id: 'RES-2026-1001',
        hotelRef: 'HTL-998412',
        status: 'Definite',
        hotelName: 'Makkah Clock Royal Tower (Fairmont)',
        city: 'Makkah',
        guestName: 'Mohammed Al-Qahtani',
        guestNationality: 'Saudi Arabia',
        bookingType: 'Travel Agent',
        agentName: 'Al-Safwa Travel & Tourism',
        checkIn: '2026-08-10',
        checkOut: '2026-08-15',
        nights: 5,
        mealPlan: 'BB',
        rooms: [
          { roomType: 'DBL', count: 1, costPerNight: 680, salePerNight: 890 }
        ],
        dailyRates: [],
        purchaseCost: 3400,
        sellingTotal: 4450,
        discount: 0,
        vatStatus: 'Included',
        vatAmount: 580.43,
        finalSellingTotal: 4450,
        netProfit: 1050,
        profitMargin: 23.6,
        remarks: 'High floor Haram view requested. Non-smoking room.'
      },
      {
        id: 'RES-2026-1002',
        hotelRef: 'HTL-774102',
        status: 'Definite',
        hotelName: 'Dar Al Taqwa Hotel Madina',
        city: 'Madina',
        guestName: 'Tariq Aziz',
        guestNationality: 'United Kingdom',
        bookingType: 'Travel Agent',
        agentName: 'Haramain Global Bookings',
        checkIn: '2026-08-12',
        checkOut: '2026-08-16',
        nights: 4,
        mealPlan: 'HB',
        rooms: [
          { roomType: 'DBL', count: 2, costPerNight: 600, salePerNight: 750 },
          { roomType: 'Executive Suite', count: 1, costPerNight: 1200, salePerNight: 1500 }
        ],
        dailyRates: [],
        purchaseCost: 9600,
        sellingTotal: 12000,
        discount: 200,
        vatStatus: 'Included',
        vatAmount: 1539.13,
        finalSellingTotal: 11800,
        netProfit: 2200,
        profitMargin: 18.6,
        remarks: 'Prophet Mosque view preferred.'
      },
      {
        id: 'RES-2026-1003',
        hotelRef: 'HTL-331094',
        status: 'Tentative',
        hotelName: 'Pullman Zamzam Makkah',
        city: 'Makkah',
        guestName: 'Omar Farooq',
        guestNationality: 'Egypt',
        bookingType: 'Direct',
        agentName: '',
        checkIn: '2026-08-20',
        checkOut: '2026-08-23',
        nights: 3,
        mealPlan: 'RO',
        rooms: [
          { roomType: 'TRP', count: 1, costPerNight: 500, salePerNight: 650 }
        ],
        dailyRates: [],
        purchaseCost: 1500,
        sellingTotal: 1950,
        discount: 0,
        vatStatus: 'Included',
        vatAmount: 254.35,
        finalSellingTotal: 1950,
        netProfit: 450,
        profitMargin: 23.1,
        remarks: 'Early check-in request.'
      }
    ],
    payments: [
      {
        id: 'PAY-1001',
        date: '2026-08-02',
        clientName: 'Al-Safwa Travel & Tourism',
        allocationType: 'Reservation',
        resId: 'RES-2026-1001',
        amount: 2500,
        method: 'Bank Transfer',
        ref: 'TR-8849201',
        remarks: 'First installment deposit for res RES-2026-1001'
      },
      {
        id: 'PAY-1002',
        date: '2026-08-04',
        clientName: 'Sheikh Abdullah Al-Mansoor',
        allocationType: 'Account Deposit',
        resId: '',
        amount: 1000,
        method: 'Cash',
        ref: 'CS-1092',
        remarks: 'Advance general credit deposit'
      }
    ]
  };

  // Worldwide & Religious Events Calendar Data
  const HOLIDAYS_DATA = [
    { date: '2026-10-12', title: 'Mid-Term School Break (Gulf Region)', type: 'school' },
    { date: '2026-11-20', title: 'Winter School Vacation (UK & Europe)', type: 'school' },
    { date: '2027-02-15', title: 'Pre-Ramadan Umrah Season Peak', type: 'religious' },
    { date: '2027-03-10', title: 'Ramadan 1448 AH Begins', type: 'religious' },
    { date: '2027-04-09', title: 'Eid Al-Fitr Holidays', type: 'religious' }
  ];

  function getHolidayEvents() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const recurring = [];
    for (let year = today.getFullYear(); year <= today.getFullYear() + 3; year++) {
      recurring.push(
        { date: `${year}-01-01`, title: 'New Year', type: 'public' },
        { date: `${year}-02-22`, title: 'Saudi Founding Day', type: 'public' },
        { date: `${year}-08-15`, title: 'Assumption Day (European Holiday)', type: 'public' },
        { date: `${year}-09-23`, title: 'Saudi National Day', type: 'public' },
        { date: `${year}-12-25`, title: 'Christmas & Winter Holidays', type: 'public' }
      );
    }
    return [...HOLIDAYS_DATA, ...recurring]
      .filter(event => event.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // App Controller Class
  class PMSApp {
    constructor(cloudStore) {
      this.cloudStore = cloudStore;
      this.state = this.loadState();
      this.removeStoredPasswords();
      this.state.paymentsMade = this.state.paymentsMade || [];
      this.currentTab = 'dashboard';
      this.tempDailyRates = [];
      this.currentRooms = [
        { roomType: 'DBL', count: 1, costPerNight: 500, salePerNight: 750 }
      ];
      this.currentExtraServices = [];
      this.calendarCurrentDate = new Date();
      this.calendarFilter = 'all';
      this.init();
    }

    loadState() {
      const storageKey = this.getStorageKey();
      let saved = localStorage.getItem(storageKey);
      // Carry forward the existing public-demo browser data once for the first
      // organization opened on this browser. A populated Supabase workspace
      // always replaces this cache during hydration.
      if (!saved && this.cloudStore?.organizationId) {
        saved = localStorage.getItem(STORAGE_KEY);
        if (saved) localStorage.setItem(storageKey, saved);
      }
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error('Error loading state:', e); }
      }
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    getStorageKey() {
      const organizationId = this.cloudStore?.organizationId;
      return organizationId ? `${STORAGE_KEY}_${organizationId}` : STORAGE_KEY;
    }

    removeStoredPasswords() {
      if (!Array.isArray(this.state.users)) return;
      this.state.users.forEach(user => {
        Object.keys(user).filter(key => /password/i.test(key)).forEach(key => delete user[key]);
      });
    }

    saveState() {
      this.removeStoredPasswords();
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.state));
      if (this.cloudStore?.organizationId) {
        this.setCloudStatus('Saving…');
        this.cloudStore.saveState(this.state)
          .then(() => this.setCloudStatus('All changes saved'))
          .catch(error => { console.error('Cloud save failed:', error); this.setCloudStatus('Cloud save failed — retry after reconnecting', true); });
      }
    }

    setCloudStatus(message, isError = false) {
      const status = document.getElementById('cloud-sync-status');
      if (!status) return;
      status.innerText = message;
      status.classList.toggle('error', isError);
    }

    async hydrateCloudState() {
      try {
        const remoteState = await this.cloudStore.loadState();
        const hasRemoteState = remoteState && Object.keys(remoteState).length;
        if (hasRemoteState) {
          this.state = remoteState;
          this.state.paymentsMade = this.state.paymentsMade || [];
        }
        this.removeStoredPasswords();
        if (!hasRemoteState) await this.cloudStore.saveState(this.state);
        this.syncAuthenticatedUser();
        this.renderUserHeaderSwitcher();
        this.applyActiveUserPermissions();
        this.populateSelectDropdowns();
        this.renderAllViews();
        localStorage.setItem(this.getStorageKey(), JSON.stringify(this.state));
        this.setCloudStatus('All changes saved');
      } catch (error) {
        console.error('Cloud load failed:', error);
        this.setCloudStatus('Cloud data unavailable', true);
        throw error;
      }
    }

    syncAuthenticatedUser() {
      const email = this.cloudStore.user?.email || '';
      const displayName = this.cloudStore.user?.user_metadata?.full_name || email.split('@')[0] || 'Team member';
      const role = this.cloudStore.role || 'View Only';
      let user = this.state.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) {
        user = { id: `AUTH-${this.cloudStore.user.id}`, name: displayName, username: email, role, email, status: 'Active' };
        this.state.users.push(user);
      }
      user.name = displayName;
      user.role = role;
      user.status = 'Active';
      this.state.activeUserId = user.id;
    }

    resetToSampleData() {
      if (confirm('Reset all system data to default sample records?')) {
        this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this.saveState();
        this.renderAllViews();
        alert('System data reset successfully!');
      }
    }

    init() {
      this.setupNavigation();
      this.setupFormListeners();
      this.setupModalListeners();
      this.renderUserHeaderSwitcher();
      this.applyActiveUserPermissions();
      this.populateSelectDropdowns();
      this.renderMultiRoomFormTable();
      this.renderExtraServicesTable();
      this.renderAllViews();
      this.setDefaultFormDates();
      this.scheduleCalendarRollover();
    }

    scheduleCalendarRollover() {
      const now = new Date();
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      window.setTimeout(() => {
        this.calendarCurrentDate = new Date();
        this.renderHolidayCalendar(this.calendarFilter);
        this.scheduleCalendarRollover();
      }, nextDay.getTime() - now.getTime());
    }

    renderUserHeaderSwitcher() {
      const select = document.getElementById('header-user-select');
      select.innerHTML = '';
      const user = this.getActiveUser();
      select.innerHTML = `<option>${user.name} (${user.role})</option>`;
      select.disabled = true;
    }

    getActiveUser() {
      return this.state.users.find(u => u.id === this.state.activeUserId) || this.state.users[0];
    }

    applyActiveUserPermissions() {
      const user = this.getActiveUser();
      document.getElementById('sb-user-name').innerText = user.name;
      document.getElementById('sb-user-role').innerText = user.role;

      const role = user.role;

      document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
        const perm = btn.getAttribute('data-perm');
        let allowed = true;

        if (btn.getAttribute('data-tab') === 'users') {
          allowed = false;
        } else if (role === 'Reservation Agent') {
          if (perm === 'acct' || perm === 'admin') allowed = false;
        } else if (role === 'Accountant') {
          if (perm === 'res' || perm === 'admin') allowed = false;
        } else if (role === 'View Only') {
          if (perm === 'acct' || perm === 'admin' || btn.getAttribute('data-tab') === 'new-reservation') allowed = false;
        }

        btn.style.display = allowed ? 'flex' : 'none';
      });

      const currentTabBtn = document.querySelector(`.sidebar-nav .nav-item[data-tab="${this.currentTab}"]`);
      if (currentTabBtn && currentTabBtn.style.display === 'none') {
        this.switchTab('dashboard');
      }
    }

    setupNavigation() {
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-tab');
          this.switchTab(tab);
        });
      });

      document.getElementById('btn-quick-new-res').addEventListener('click', () => {
        this.resetReservationForm();
        this.switchTab('new-reservation');
      });

      document.getElementById('flight-status-form').addEventListener('submit', event => this.openFlightRadarStatus(event));


      const cityTabs = document.querySelectorAll('.city-tab');
      cityTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          cityTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const city = tab.getAttribute('data-city');
          document.querySelectorAll('.city-market-content').forEach(c => c.classList.remove('active'));
          document.getElementById(`market-${city}`).classList.add('active');
        });
      });

      document.getElementById('cal-prev-month').addEventListener('click', () => {
        this.calendarCurrentDate.setDate(1);
        this.calendarCurrentDate.setMonth(this.calendarCurrentDate.getMonth() - 1);
        this.renderHolidayCalendar(this.calendarFilter);
      });

      document.getElementById('cal-next-month').addEventListener('click', () => {
        this.calendarCurrentDate.setDate(1);
        this.calendarCurrentDate.setMonth(this.calendarCurrentDate.getMonth() + 1);
        this.renderHolidayCalendar(this.calendarFilter);
      });

      document.querySelectorAll('.holiday-tags .tag').forEach(t => {
        t.addEventListener('click', () => {
          document.querySelectorAll('.holiday-tags .tag').forEach(tg => tg.classList.remove('active'));
          t.classList.add('active');
          this.renderHolidayCalendar(t.getAttribute('data-filter'));
        });
      });
    }

    openFlightRadarStatus(event) {
      event.preventDefault();
      const flightNumber = document.getElementById('flight-number').value.trim().toUpperCase();
      const result = document.getElementById('flight-status-result');
      const safeFlightNumber = flightNumber.replace(/[^A-Z0-9]/g, '');
      if (!safeFlightNumber) return;
      const link = document.createElement('a');
      link.href = `https://www.flightradar24.com/data/flights/${encodeURIComponent(safeFlightNumber.toLowerCase())}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = `Open ${safeFlightNumber} on FlightRadar24`;
      result.className = 'flight-status-result has-flight';
      result.replaceChildren(link);
    }

    switchTab(tabId) {
      this.currentTab = tabId;
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
      });

      document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `view-${tabId}`);
      });

      const titleMap = {
        'dashboard': { title: 'Dashboard & Market Insights', sub: 'Real-time occupancy, revenue analytics, and market trends' },
        'new-reservation': { title: 'Hotel Reservation Entry', sub: 'Create or update multi-room booking details, rates, and financial terms' },
        'reservations-list': { title: 'Reservations Master Registry', sub: 'Search, filter, manage, and export vouchers for all bookings' },
        'clients': { title: 'Clients & Travel Agents Directory', sub: 'Manage direct clients, travel agencies, brokers, and credit limits' },
        'payments': { title: 'Payments & Cashier Desk', sub: 'Post payment entries against reservations or general deposit accounts' },
        'account-statement': { title: 'Client Account Statement (Ledger)', sub: 'Itemized debit bookings, credit payments, and running balance ledger' },
        'reports': { title: 'Operational & Financial Reports Engine', sub: 'Daily arrivals, revenue margin analysis, collections log, and occupancy' },
        'users': { title: 'User Management & Role Access', sub: 'Configure system user accounts, login credentials, and permission roles' },
        'base-setup': { title: 'Base Setup & System Master Data', sub: 'Manage hotels master data, master nationalities, tax rules, and database state' }
      };

      if (titleMap[tabId]) {
        document.getElementById('page-title').innerText = titleMap[tabId].title;
        document.getElementById('page-subtitle').innerText = titleMap[tabId].sub;
      }

      if (tabId === 'dashboard') this.renderDashboard();
      if (tabId === 'reservations-list') this.renderReservationsMasterTable();
      if (tabId === 'clients') this.renderClientsTable();
      if (tabId === 'payments') this.renderPaymentsView();
      if (tabId === 'account-statement') this.populateStatementClientSelect();
      if (tabId === 'reports') this.runCurrentReport();
      if (tabId === 'users') this.renderUsersTable();
      if (tabId === 'base-setup') {
        this.renderHotelsMasterTable();
        this.renderNationalitiesMasterTags();
      }
    }



    formatDate(dateValue) {
      if (!dateValue) return '';
      const parts = String(dateValue).split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateValue;
    }

    setupFormListeners() {
      const resForm = document.getElementById('reservation-form');

      ['res-checkin', 'res-checkout'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => this.calculateFormFinancials());
      });

      ['res-discount-amount', 'res-vat-toggle'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => this.calculateFormFinancials());
        document.getElementById(id).addEventListener('change', () => this.calculateFormFinancials());
      });

      resForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveReservation();
      });

      document.getElementById('btn-reset-res-form').addEventListener('click', () => this.resetReservationForm());
      document.getElementById('btn-open-daily-rates').addEventListener('click', () => this.openDailyRatesModal());
      document.getElementById('btn-apply-daily-rates').addEventListener('click', () => this.applyDailyRatesFromModal());
      document.getElementById('btn-add-room-line').addEventListener('click', () => this.addRoomLine());
      document.getElementById('btn-add-extra-service').addEventListener('click', () => this.addExtraService());

      document.getElementById('client-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveClient();
      });

      document.getElementById('hotel-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveHotel();
      });

      document.getElementById('user-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveUser();
      });

      document.getElementById('payment-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.savePayment();
      });
      document.getElementById('payment-made-form').addEventListener('submit', (e) => { e.preventDefault(); this.savePaymentMade(); });
      document.getElementById('paid-recipient-type').addEventListener('change', () => this.populatePaymentMadeRecipients());
      document.getElementById('paid-recipient').addEventListener('change', () => this.populatePaymentMadeReservations());

      document.getElementById('pay-client-id').addEventListener('change', () => this.updatePaymentResDropdown());
      document.getElementById('pay-allocation-type').addEventListener('change', () => this.updatePaymentAllocationFields());

      document.getElementById('btn-generate-statement').addEventListener('click', () => this.generateAccountStatement());
      document.getElementById('btn-print-statement').addEventListener('click', () => window.print());
      document.getElementById('btn-print-confirmation').addEventListener('click', () => window.print());
      document.getElementById('btn-print-guest-voucher').addEventListener('click', () => window.print());

      document.getElementById('btn-preview-confirmation').addEventListener('click', () => {
        const dbId = document.getElementById('res-db-id').value;
        if (dbId) this.openConfirmationLetterModal(dbId);
      });

      document.getElementById('btn-preview-guest-voucher').addEventListener('click', () => {
        const dbId = document.getElementById('res-db-id').value;
        if (dbId) this.openGuestVoucherModal(dbId);
      });

      document.getElementById('btn-reset-sample-data').addEventListener('click', () => this.resetToSampleData());

      document.getElementById('filter-res-search').addEventListener('input', () => this.renderReservationsMasterTable());
      document.getElementById('filter-res-status').addEventListener('change', () => this.renderReservationsMasterTable());
      document.getElementById('filter-res-city').addEventListener('change', () => this.renderReservationsMasterTable());
      document.getElementById('filter-res-source').addEventListener('change', () => this.renderReservationsMasterTable());

      document.getElementById('filter-client-search').addEventListener('input', () => this.renderClientsTable());
      document.getElementById('filter-client-type').addEventListener('change', () => this.renderClientsTable());

      document.querySelectorAll('.report-tab').forEach(t => {
        t.addEventListener('click', () => {
          document.querySelectorAll('.report-tab').forEach(rt => rt.classList.remove('active'));
          t.classList.add('active');
          this.runCurrentReport();
        });
      });
      document.getElementById('btn-run-report').addEventListener('click', () => this.runCurrentReport());
      document.getElementById('btn-export-report-pdf').addEventListener('click', () => this.exportCurrentReportPdf());
    }

    openModal(modalId) { document.getElementById(modalId).classList.add('active'); }
    closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }

    setupModalListeners() {
      document.getElementById('btn-open-add-client').addEventListener('click', () => {
        document.getElementById('client-form').reset();
        document.getElementById('client-id-val').value = '';
        document.getElementById('client-modal-title').innerText = 'Add New Client / Agent';
        this.openModal('modal-client-form');
      });

      document.getElementById('btn-open-add-hotel').addEventListener('click', () => {
        document.getElementById('hotel-form').reset();
        document.getElementById('hotel-id-val').value = '';
        document.getElementById('hotel-modal-title').innerText = 'Add New Hotel';
        this.openModal('modal-hotel-form');
      });

      document.getElementById('btn-open-add-user').addEventListener('click', () => {
        document.getElementById('user-form').reset();
        document.getElementById('user-id-val').value = '';
        document.getElementById('user-modal-title').innerText = 'Add New System User';
        this.openModal('modal-user-form');
      });

      document.getElementById('btn-add-nationality').addEventListener('click', () => {
        const newNat = prompt('Enter New Master Nationality name:');
        if (newNat && newNat.trim() !== '') {
          const formatted = newNat.trim();
          if (!this.state.nationalities.includes(formatted)) {
            this.state.nationalities.push(formatted);
            this.saveState();
            this.populateSelectDropdowns();
            this.renderNationalitiesMasterTags();
            alert(`Added ${formatted} to master nationalities!`);
          }
        }
      });
    }

    setDefaultFormDates() {
      const today = new Date();
      const inStr = today.toISOString().split('T')[0];
      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + 3);
      const outStr = nextDate.toISOString().split('T')[0];

      document.getElementById('res-checkin').value = inStr;
      document.getElementById('res-checkout').value = outStr;
      this.calculateFormFinancials();
    }

    // POPULATE SELECT DROPDOWNS INCLUDING MASTER NATIONALITIES
    populateSelectDropdowns() {
      // Keep a user's in-progress selections intact when master data is refreshed.
      const selectedValues = {
        hotel: document.getElementById('res-hotel-name').value,
        reportHotel: document.getElementById('rpt-hotel-filter').value,
        agent: document.getElementById('res-agent-name').value,
        paymentClient: document.getElementById('pay-client-id').value,
        statementClient: document.getElementById('stmt-client-select').value,
        reservationNationality: document.getElementById('res-guest-nationality').value,
        clientNationality: document.getElementById('client-nat-val').value
      };

      // Hotels Select
      const hotelSelect = document.getElementById('res-hotel-name');
      const rptHotelSelect = document.getElementById('rpt-hotel-filter');

      hotelSelect.innerHTML = '<option value="" disabled selected>-- Select Hotel --</option>';
      rptHotelSelect.innerHTML = '<option value="ALL">All Hotels</option>';

      this.state.hotels.forEach(h => {
        const opt = `<option value="${h.name}">${h.name} (${h.city})</option>`;
        hotelSelect.innerHTML += opt;
        rptHotelSelect.innerHTML += opt;
      });

      // Agents & Clients Select
      const agentSelect = document.getElementById('res-agent-name');
      const payClientSelect = document.getElementById('pay-client-id');
      const stmtClientSelect = document.getElementById('stmt-client-select');

      agentSelect.innerHTML = '<option value="" disabled selected>-- Select Travel Agent --</option>';
      payClientSelect.innerHTML = '<option value="" disabled selected>-- Select Client / Agent --</option>';
      stmtClientSelect.innerHTML = '<option value="" disabled selected>-- Select Client / Agent --</option>';

      this.state.clients.forEach(c => {
        // Direct clients are not valid choices for a travel-agent booking.
        if (c.type === 'Travel Agent' || c.type === 'Both') {
          agentSelect.innerHTML += `<option value="${c.name}">${c.name} (${c.type})</option>`;
        }
        payClientSelect.innerHTML += `<option value="${c.id}">${c.name} (${c.type})</option>`;
        stmtClientSelect.innerHTML += `<option value="${c.id}">${c.name} (${c.type})</option>`;
      });
      this.state.hotels.forEach(h => {
        stmtClientSelect.innerHTML += `<option value="HOTEL:${h.id}">${h.name} (Direct Hotel Ledger)</option>`;
      });

      // Guest Nationalities Select (Sourced from Base Setup)
      const resNatSelect = document.getElementById('res-guest-nationality');
      const clientNatSelect = document.getElementById('client-nat-val');

      resNatSelect.innerHTML = '<option value="" disabled selected>-- Select Guest Nationality --</option>';
      clientNatSelect.innerHTML = '<option value="" disabled selected>-- Select Nationality --</option>';

      // Sort nationalities alphabetically
      const sortedNats = [...this.state.nationalities].sort();
      sortedNats.forEach(nat => {
        resNatSelect.innerHTML += `<option value="${nat}">${nat}</option>`;
        clientNatSelect.innerHTML += `<option value="${nat}">${nat}</option>`;
      });

      const restoreSelection = (select, value) => {
        if (value && Array.from(select.options).some(option => option.value === value)) select.value = value;
      };
      restoreSelection(hotelSelect, selectedValues.hotel);
      restoreSelection(rptHotelSelect, selectedValues.reportHotel);
      restoreSelection(agentSelect, selectedValues.agent);
      restoreSelection(payClientSelect, selectedValues.paymentClient);
      restoreSelection(stmtClientSelect, selectedValues.statementClient);
      restoreSelection(resNatSelect, selectedValues.reservationNationality);
      restoreSelection(clientNatSelect, selectedValues.clientNationality);
    }

    // Render Nationalities Master Tags in Base Setup
    renderNationalitiesMasterTags() {
      const container = document.getElementById('nationalities-tags-container');
      if (!container) return;
      container.innerHTML = '';

      const sorted = [...this.state.nationalities].sort();
      sorted.forEach(nat => {
        container.innerHTML += `
          <span class="tag tag-all" style="margin-bottom: 6px;">
            ${nat} <i class="fa-solid fa-xmark text-rose" style="cursor:pointer; margin-left: 4px;" onclick="app.deleteNationality('${nat}')"></i>
          </span>
        `;
      });
    }

    deleteNationality(natName) {
      if (confirm(`Remove ${natName} from master nationalities?`)) {
        this.state.nationalities = this.state.nationalities.filter(n => n !== natName);
        this.saveState();
        this.populateSelectDropdowns();
        this.renderNationalitiesMasterTags();
      }
    }

    // MULTI-ROOM RATE TABLE ENGINE
    renderMultiRoomFormTable() {
      const tbody = document.getElementById('multi-rooms-tbody');
      tbody.innerHTML = '';

      const nights = parseInt(document.getElementById('res-nights').value) || 1;

      this.currentRooms.forEach((rm, idx) => {
        const lineTotalSale = rm.count * rm.salePerNight * nights;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <select class="form-control rm-type-select" data-idx="${idx}">
              <option value="DBL" ${rm.roomType === 'DBL' ? 'selected' : ''}>DBL - Double Room</option>
              <option value="TRP" ${rm.roomType === 'TRP' ? 'selected' : ''}>TRP - Triple Room</option>
              <option value="QUD" ${rm.roomType === 'QUD' ? 'selected' : ''}>QUD - Quadruple Room</option>
              <option value="QUINT" ${rm.roomType === 'QUINT' ? 'selected' : ''}>QUINT - Quintuple Room</option>
              <option value="Junior Suite" ${rm.roomType === 'Junior Suite' ? 'selected' : ''}>Junior Suite</option>
              <option value="Executive Suite" ${rm.roomType === 'Executive Suite' ? 'selected' : ''}>Executive Suite</option>
              <option value="Royal Haram Suite" ${rm.roomType === 'Royal Haram Suite' ? 'selected' : ''}>Royal Haram Suite</option>
            </select>
          </td>
          <td>
            <input type="number" class="form-control rm-count-input" data-idx="${idx}" value="${rm.count}" min="1">
          </td>
          <td>
            <input type="number" class="form-control rm-cost-input" data-idx="${idx}" value="${rm.costPerNight}" step="0.01" placeholder="0.00">
          </td>
          <td>
            <input type="number" class="form-control rm-sale-input" data-idx="${idx}" value="${rm.salePerNight}" step="0.01" placeholder="0.00">
          </td>
          <td>
            <strong class="text-gold">${lineTotalSale.toFixed(2)} SAR</strong>
          </td>
          <td>
            ${this.currentRooms.length > 1 ? `<button type="button" class="btn btn-rose btn-sm" onclick="app.removeRoomLine(${idx})"><i class="fa-solid fa-trash"></i></button>` : `<span class="text-muted small">Primary Line</span>`}
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.rm-type-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const idx = e.target.getAttribute('data-idx');
          this.currentRooms[idx].roomType = e.target.value;
          this.calculateFormFinancials();
        });
      });

      tbody.querySelectorAll('.rm-count-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = e.target.getAttribute('data-idx');
          this.currentRooms[idx].count = parseInt(e.target.value) || 1;
          this.calculateFormFinancials();
        });
      });

      tbody.querySelectorAll('.rm-cost-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = e.target.getAttribute('data-idx');
          this.currentRooms[idx].costPerNight = parseFloat(e.target.value) || 0;
          this.calculateFormFinancials();
        });
      });

      tbody.querySelectorAll('.rm-sale-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = e.target.getAttribute('data-idx');
          this.currentRooms[idx].salePerNight = parseFloat(e.target.value) || 0;
          this.calculateFormFinancials();
        });
      });

      this.calculateFormFinancials();
    }

    addRoomLine() {
      this.currentRooms.push({ roomType: 'DBL', count: 1, costPerNight: 500, salePerNight: 700 });
      this.renderMultiRoomFormTable();
    }

    removeRoomLine(index) {
      if (this.currentRooms.length > 1) {
        this.currentRooms.splice(index, 1);
        this.renderMultiRoomFormTable();
      }
    }

    renderExtraServicesTable() {
      const tbody = document.getElementById('extra-services-tbody');
      tbody.innerHTML = '';
      this.currentExtraServices.forEach((service, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input class="form-control extra-service-name" data-idx="${idx}" value="${service.name}" placeholder="e.g. Extra Iftar"></td>
          <td><input type="number" min="1" class="form-control extra-service-qty" data-idx="${idx}" value="${service.quantity}"></td>
          <td><input type="number" min="0" step="0.01" class="form-control extra-service-cost" data-idx="${idx}" value="${service.costPerUnit || 0}"></td>
          <td><input type="number" min="0" step="0.01" class="form-control extra-service-price" data-idx="${idx}" value="${service.unitPrice}"></td>
          <td><strong class="text-gold">${(service.quantity * service.unitPrice).toFixed(2)} SAR</strong></td>
          <td><button type="button" class="btn btn-rose btn-sm" onclick="app.removeExtraService(${idx})"><i class="fa-solid fa-trash"></i></button></td>`;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('.extra-service-name').forEach(input => input.addEventListener('input', e => { this.currentExtraServices[e.target.dataset.idx].name = e.target.value; }));
      tbody.querySelectorAll('.extra-service-qty').forEach(input => input.addEventListener('input', e => { this.currentExtraServices[e.target.dataset.idx].quantity = parseInt(e.target.value) || 1; this.renderExtraServicesTable(); }));
      tbody.querySelectorAll('.extra-service-price').forEach(input => input.addEventListener('input', e => { this.currentExtraServices[e.target.dataset.idx].unitPrice = parseFloat(e.target.value) || 0; this.renderExtraServicesTable(); }));
      tbody.querySelectorAll('.extra-service-cost').forEach(input => input.addEventListener('input', e => { this.currentExtraServices[e.target.dataset.idx].costPerUnit = parseFloat(e.target.value) || 0; this.renderExtraServicesTable(); }));
      this.calculateFormFinancials();
    }

    addExtraService() {
      this.currentExtraServices.push({ name: 'Extra Meal', quantity: 1, costPerUnit: 0, unitPrice: 0 });
      this.renderExtraServicesTable();
    }

    removeExtraService(index) {
      this.currentExtraServices.splice(index, 1);
      this.renderExtraServicesTable();
    }

    calculateFormFinancials() {
      const checkInStr = document.getElementById('res-checkin').value;
      const checkOutStr = document.getElementById('res-checkout').value;
      if (!checkInStr || !checkOutStr) return;

      const d1 = new Date(checkInStr);
      const d2 = new Date(checkOutStr);
      let diffTime = d2.getTime() - d1.getTime();
      let diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
      if (diffDays <= 0) diffDays = 1;

      document.getElementById('res-nights').value = diffDays;

      let totalPurchaseCost = 0;
      let totalSellingPrice = 0;
      let totalRoomsCount = 0;

      this.currentRooms.forEach(rm => {
        totalRoomsCount += rm.count;
        totalPurchaseCost += (rm.costPerNight * rm.count * diffDays);
        totalSellingPrice += (rm.salePerNight * rm.count * diffDays);
      });
      totalPurchaseCost += this.currentExtraServices.reduce((total, service) => total + (service.quantity * (service.costPerUnit || 0)), 0);
      totalSellingPrice += this.currentExtraServices.reduce((total, service) => total + (service.quantity * service.unitPrice), 0);

      document.getElementById('display-total-rooms-count').value = `${totalRoomsCount} Room(s)`;

      const discount = parseFloat(document.getElementById('res-discount-amount').value) || 0;
      const vatStatus = document.getElementById('res-vat-toggle').value;

      let totalAfterDiscount = totalSellingPrice - discount;
      if (totalAfterDiscount < 0) totalAfterDiscount = 0;

      let finalBilledTotal = totalAfterDiscount;
      let vatAmount = 0;

      if (vatStatus === 'Excluded') {
        vatAmount = totalAfterDiscount * 0.15;
        finalBilledTotal = totalAfterDiscount + vatAmount;
      } else if (vatStatus === 'Included') {
        vatAmount = totalAfterDiscount * (15 / 115);
      }

      const netProfit = finalBilledTotal - totalPurchaseCost;
      const marginPct = finalBilledTotal > 0 ? ((netProfit / finalBilledTotal) * 100) : 0;

      document.getElementById('display-cost').innerText = totalPurchaseCost.toFixed(2) + ' SAR';
      document.getElementById('display-selling').innerText = finalBilledTotal.toFixed(2) + ' SAR';
      document.getElementById('display-profit').innerText = netProfit.toFixed(2) + ' SAR';
      document.getElementById('display-margin').innerText = marginPct.toFixed(1) + '%';
    }

    openDailyRatesModal() {
      const nights = parseInt(document.getElementById('res-nights').value) || 1;
      const checkInStr = document.getElementById('res-checkin').value;
      const tbody = document.getElementById('daily-rates-tbody');
      tbody.innerHTML = '';

      let startDate = new Date(checkInStr);

      for (let i = 0; i < nights; i++) {
        let currDate = new Date(startDate);
        currDate.setDate(currDate.getDate() + i);
        let dateTag = currDate.toISOString().split('T')[0];

        let currentVal = (this.tempDailyRates && this.tempDailyRates[i] !== undefined) ? this.tempDailyRates[i] : 0;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>Night #${i + 1}</strong></td>
          <td>${dateTag} (${currDate.toLocaleDateString('en-US', { weekday: 'short' })})</td>
          <td>
            <input type="number" class="form-control daily-rate-input" data-index="${i}" value="${currentVal}" step="0.01">
          </td>
        `;
        tbody.appendChild(row);
      }

      this.recalculateModalDailyRatesTotal();

      tbody.querySelectorAll('.daily-rate-input').forEach(inp => {
        inp.addEventListener('input', () => this.recalculateModalDailyRatesTotal());
      });

      this.openModal('modal-daily-rates');
    }

    recalculateModalDailyRatesTotal() {
      const inputs = document.querySelectorAll('.daily-rate-input');
      let total = 0;
      inputs.forEach(inp => {
        total += parseFloat(inp.value) || 0;
      });
      document.getElementById('daily-rates-calculated-total').innerText = total.toFixed(2) + ' SAR';
    }

    applyDailyRatesFromModal() {
      const inputs = document.querySelectorAll('.daily-rate-input');
      this.tempDailyRates = [];
      inputs.forEach(inp => {
        this.tempDailyRates.push(parseFloat(inp.value) || 0);
      });
      this.closeModal('modal-daily-rates');
      this.calculateFormFinancials();
    }

    saveReservation() {
      const dbId = document.getElementById('res-db-id').value;
      const hotelRef = document.getElementById('res-hotel-ref').value;
      const status = document.getElementById('res-status').value;
      const hotelName = document.getElementById('res-hotel-name').value;
      const guestName = document.getElementById('res-guest-name').value;
      const guestNationality = document.getElementById('res-guest-nationality').value;
      const bookingType = document.getElementById('res-booking-type').value;
      const agentName = document.getElementById('res-agent-name').value;
      const checkIn = document.getElementById('res-checkin').value;
      const checkOut = document.getElementById('res-checkout').value;
      const nights = parseInt(document.getElementById('res-nights').value) || 1;
      const mealPlan = document.getElementById('res-meal-plan').value;
      const discount = parseFloat(document.getElementById('res-discount-amount').value) || 0;
      const vatStatus = document.getElementById('res-vat-toggle').value;
      const remarks = document.getElementById('res-remarks').value;

      let totalPurchaseCost = 0;
      let totalSellingPrice = 0;

      this.currentRooms.forEach(rm => {
        totalPurchaseCost += (rm.costPerNight * rm.count * nights);
        totalSellingPrice += (rm.salePerNight * rm.count * nights);
      });
      totalPurchaseCost += this.currentExtraServices.reduce((total, service) => total + (service.quantity * (service.costPerUnit || 0)), 0);
      totalSellingPrice += this.currentExtraServices.reduce((total, service) => total + (service.quantity * service.unitPrice), 0);

      let totalAfterDiscount = totalSellingPrice - discount;
      if (totalAfterDiscount < 0) totalAfterDiscount = 0;
      let finalSellingTotal = totalAfterDiscount;
      let vatAmount = 0;

      if (vatStatus === 'Excluded') {
        vatAmount = totalAfterDiscount * 0.15;
        finalSellingTotal = totalAfterDiscount + vatAmount;
      } else if (vatStatus === 'Included') {
        vatAmount = totalAfterDiscount * (15 / 115);
      }

      const netProfit = finalSellingTotal - totalPurchaseCost;
      const profitMargin = finalSellingTotal > 0 ? ((netProfit / finalSellingTotal) * 100) : 0;

      const foundHotel = this.state.hotels.find(h => h.name === hotelName);
      const city = foundHotel ? foundHotel.city : 'Makkah';

      let resObj = {
        id: dbId || this.generateSystemResId(),
        hotelRef,
        status,
        hotelName,
        city,
        guestName,
        guestNationality,
        bookingType,
        agentName,
        checkIn,
        checkOut,
        nights,
        mealPlan,
        rooms: JSON.parse(JSON.stringify(this.currentRooms)),
        extraServices: JSON.parse(JSON.stringify(this.currentExtraServices)),
        dailyRates: [...this.tempDailyRates],
        purchaseCost: totalPurchaseCost,
        sellingTotal: totalSellingPrice,
        discount,
        vatStatus,
        vatAmount,
        finalSellingTotal,
        netProfit,
        profitMargin,
        remarks
      };

      if (dbId) {
        const idx = this.state.reservations.findIndex(r => r.id === dbId);
        if (idx !== -1) this.state.reservations[idx] = resObj;
      } else {
        this.state.reservations.unshift(resObj);
      }

      this.saveState();
      alert(`Reservation ${resObj.id} saved successfully!`);
      this.resetReservationForm();
      this.switchTab('reservations-list');
    }

    generateSystemResId() {
      return this.nextSequentialId('RES-2026-', 1000, this.state.reservations);
    }

    nextSequentialId(prefix, startingNumber, records) {
      const maxNumber = records.reduce((max, record) => {
        const number = Number.parseInt(String(record.id || '').split('-').pop(), 10);
        return Number.isFinite(number) ? Math.max(max, number) : max;
      }, startingNumber);
      return `${prefix}${maxNumber + 1}`;
    }

    resetReservationForm() {
      document.getElementById('reservation-form').reset();
      document.getElementById('res-db-id').value = '';
      document.getElementById('res-system-id').value = '';
      document.getElementById('res-form-title').innerText = 'Create New Hotel Reservation';
      document.getElementById('res-id-badge').innerText = 'ID: System Auto Generated';
      document.getElementById('btn-preview-confirmation').disabled = true;
      document.getElementById('btn-preview-guest-voucher').disabled = true;
      this.tempDailyRates = [];
      this.currentRooms = [{ roomType: 'DBL', count: 1, costPerNight: 500, salePerNight: 750 }];
      this.currentExtraServices = [];
      this.renderMultiRoomFormTable();
      this.renderExtraServicesTable();
      this.setDefaultFormDates();
    }

    editReservation(id) {
      const res = this.state.reservations.find(r => r.id === id);
      if (!res) return;

      document.getElementById('res-db-id').value = res.id;
      document.getElementById('res-system-id').value = res.id;
      document.getElementById('res-hotel-ref').value = res.hotelRef;
      document.getElementById('res-status').value = res.status;
      document.getElementById('res-hotel-name').value = res.hotelName;
      document.getElementById('res-guest-name').value = res.guestName;
      document.getElementById('res-guest-nationality').value = res.guestNationality || 'Saudi Arabia';
      document.getElementById('res-booking-type').value = res.bookingType;

      document.getElementById('res-agent-name').value = res.agentName || '';

      document.getElementById('res-checkin').value = res.checkIn;
      document.getElementById('res-checkout').value = res.checkOut;
      document.getElementById('res-nights').value = res.nights;
      document.getElementById('res-meal-plan').value = res.mealPlan;
      document.getElementById('res-discount-amount').value = res.discount;
      document.getElementById('res-vat-toggle').value = res.vatStatus;
      document.getElementById('res-remarks').value = res.remarks || '';

      this.currentRooms = res.rooms ? JSON.parse(JSON.stringify(res.rooms)) : [{ roomType: 'DBL', count: 1, costPerNight: 500, salePerNight: 750 }];
      this.currentExtraServices = res.extraServices ? JSON.parse(JSON.stringify(res.extraServices)) : [];
      this.tempDailyRates = res.dailyRates ? [...res.dailyRates] : [];

      document.getElementById('res-form-title').innerText = `Edit Reservation ${res.id}`;
      document.getElementById('res-id-badge').innerText = `ID: ${res.id}`;
      document.getElementById('btn-preview-confirmation').disabled = false;
      document.getElementById('btn-preview-guest-voucher').disabled = false;

      this.renderMultiRoomFormTable();
      this.renderExtraServicesTable();
      this.switchTab('new-reservation');
    }

    deleteReservation(id) {
      if (confirm(`Delete reservation ${id}?`)) {
        this.state.reservations = this.state.reservations.filter(r => r.id !== id);
        this.saveState();
        this.renderReservationsMasterTable();
        this.renderDashboard();
      }
    }

    // 1. TRAVEL AGENCY CONFIRMATION LETTER MODAL (WITH RATES)
    openConfirmationLetterModal(resId) {
      const res = this.state.reservations.find(r => r.id === resId);
      if (!res) return;

      document.getElementById('vch-system-id').innerText = res.id;
      document.getElementById('vch-hotel-ref').innerText = res.hotelRef;
      document.getElementById('vch-status-badge').innerText = `${res.status.toUpperCase()} BOOKING`;
      document.getElementById('vch-status-badge').className = `badge badge-lg ${res.status === 'Definite' ? 'badge-emerald' : res.status === 'Tentative' ? 'badge-gold' : 'badge-rose'}`;

      document.getElementById('vch-issue-date').innerText = this.formatDate(new Date().toISOString().split('T')[0]);
      document.getElementById('vch-source-channel').innerText = res.bookingType;

      document.getElementById('vch-hotel-name').innerText = res.hotelName;
      document.getElementById('vch-hotel-city').innerText = res.city;
      document.getElementById('vch-guest-name').innerText = res.guestName;
      document.getElementById('vch-guest-nationality').innerText = res.guestNationality || 'N/A';
      document.getElementById('vch-agent-name').innerText = res.agentName || 'Direct Booking';

      document.getElementById('vch-checkin').innerText = this.formatDate(res.checkIn);
      document.getElementById('vch-checkout').innerText = this.formatDate(res.checkOut);
      document.getElementById('vch-nights').innerText = `${res.nights} Nights`;
      document.getElementById('vch-meal-plan').innerText = `${res.mealPlan} Plan`;
      document.getElementById('vch-remarks').innerText = res.remarks || 'Standard reservation. No special requests specified.';
      const extras = res.extraServices || [];
      document.getElementById('vch-extra-services').innerHTML = extras.length ? `<table class="data-table"><thead><tr><th>Service</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>${extras.map(s => `<tr><td>${s.name}</td><td>${s.quantity}</td><td>${s.unitPrice.toFixed(2)} SAR</td><td>${(s.quantity * s.unitPrice).toFixed(2)} SAR</td></tr>`).join('')}</tbody></table>` : 'No extra services recorded.';

      // Itemized Room Table WITH Rates
      const tbody = document.getElementById('vch-multi-room-tbody');
      tbody.innerHTML = '';

      if (res.rooms && res.rooms.length > 0) {
        res.rooms.forEach(rm => {
          const rmTotal = rm.count * rm.salePerNight * res.nights;
          tbody.innerHTML += `
            <tr>
              <td><strong>${rm.roomType}</strong></td>
              <td>${rm.count} Room(s)</td>
              <td>${rm.salePerNight.toFixed(2)} SAR / Night</td>
              <td><strong>${rmTotal.toFixed(2)} SAR</strong></td>
            </tr>
          `;
        });
      } else {
        tbody.innerHTML = `<tr><td colspan="4">Standard Room Configuration</td></tr>`;
      }

      document.getElementById('vch-total-billed').innerText = res.finalSellingTotal.toFixed(2) + ' SAR';
      document.getElementById('vch-vat-status').innerText = res.vatStatus;

      const resPayments = this.state.payments.filter(p => p.resId === res.id).reduce((acc, p) => acc + p.amount, 0);
      document.getElementById('vch-pay-status').innerText = resPayments >= res.finalSellingTotal ? 'PAID IN FULL' : resPayments > 0 ? `PARTIAL (${resPayments.toFixed(0)} SAR)` : 'UNPAID LEDGER';

      this.openModal('modal-confirmation-letter');
    }

    // 2. GUEST CHECK-IN HOTEL VOUCHER MODAL (NO RATES SHOWN AT ALL!)
    openGuestVoucherModal(resId) {
      const res = this.state.reservations.find(r => r.id === resId);
      if (!res) return;

      document.getElementById('g-vch-system-id').innerText = res.id;
      document.getElementById('g-vch-hotel-ref').innerText = res.hotelRef;
      document.getElementById('g-vch-status-badge').innerText = `${res.status.toUpperCase()} GUEST VOUCHER`;
      document.getElementById('g-vch-status-badge').className = `badge badge-lg ${res.status === 'Definite' ? 'badge-emerald' : 'badge-gold'}`;

      document.getElementById('g-vch-issue-date').innerText = new Date().toISOString().split('T')[0];
      document.getElementById('g-vch-hotel-name').innerText = res.hotelName;
      document.getElementById('g-vch-hotel-city').innerText = res.city;
      document.getElementById('g-vch-guest-name').innerText = res.guestName;
      document.getElementById('g-vch-guest-nationality').innerText = res.guestNationality || 'N/A';

      document.getElementById('g-vch-checkin').innerText = res.checkIn;
      document.getElementById('g-vch-checkout').innerText = res.checkOut;
      document.getElementById('g-vch-nights').innerText = `${res.nights} Nights`;
      document.getElementById('g-vch-meal-plan').innerText = `${res.mealPlan} Plan Included`;
      document.getElementById('g-vch-remarks').innerText = res.remarks || 'Standard check-in. Non-smoking room requested.';

      // Itemized Room Table WITH NO PRICES
      const tbody = document.getElementById('g-vch-multi-room-tbody');
      tbody.innerHTML = '';

      if (res.rooms && res.rooms.length > 0) {
        res.rooms.forEach(rm => {
          tbody.innerHTML += `
            <tr>
              <td><strong>${rm.roomType}</strong></td>
              <td><strong>${rm.count} Room(s)</strong></td>
              <td>${res.mealPlan} Plan Included</td>
            </tr>
          `;
        });
      } else {
        tbody.innerHTML = `<tr><td colspan="3">1 x Reserved Accommodation Room</td></tr>`;
      }

      this.openModal('modal-guest-voucher');
    }

    renderDashboard() {
      let totalRevenue = 0, totalProfit = 0, activeRes = 0, definiteCount = 0, tentativeCount = 0;

      this.state.reservations.forEach(r => {
        if (r.status !== 'Cancelled') {
          totalRevenue += r.finalSellingTotal;
          totalProfit += r.netProfit;
          activeRes++;
          if (r.status === 'Definite') definiteCount++;
          if (r.status === 'Tentative') tentativeCount++;
        }
      });

      let totalPayments = this.state.payments.reduce((acc, p) => acc + p.amount, 0);
      let pendingBalance = totalRevenue - totalPayments;
      if (pendingBalance < 0) pendingBalance = 0;

      let avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

      document.getElementById('kpi-total-revenue').innerText = totalRevenue.toFixed(2) + ' SAR';
      document.getElementById('kpi-revenue-count').innerText = `${activeRes} Active Bookings`;

      document.getElementById('kpi-net-profit').innerText = totalProfit.toFixed(2) + ' SAR';
      document.getElementById('kpi-profit-margin').innerText = `${avgMargin.toFixed(1)}% Avg Margin`;

      document.getElementById('kpi-active-res').innerText = activeRes;
      document.getElementById('kpi-res-status').innerText = `${definiteCount} Definite / ${tentativeCount} Tentative`;

      document.getElementById('kpi-payments-received').innerText = totalPayments.toFixed(2) + ' SAR';
      document.getElementById('kpi-pending-balance').innerText = `${pendingBalance.toFixed(2)} SAR Pending Ledger`;

      const recentTbody = document.getElementById('dashboard-recent-tbody');
      recentTbody.innerHTML = '';

      this.state.reservations.slice(0, 5).forEach(r => {
        let roomSummary = r.rooms ? r.rooms.map(rm => `${rm.count}x ${rm.roomType}`).join(', ') : '1x Room';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${r.id}</strong><br><span class="small text-muted">${r.hotelRef}</span></td>
          <td>${r.hotelName}</td>
          <td>${r.guestName}</td>
          <td>${r.bookingType} ${r.agentName ? `(${r.agentName})` : ''}</td>
          <td>${r.checkIn}</td>
          <td>${r.checkOut}</td>
          <td><span class="badge badge-blue">${roomSummary}</span></td>
          <td><span class="badge ${r.status === 'Definite' ? 'badge-emerald' : r.status === 'Tentative' ? 'badge-gold' : 'badge-rose'}">${r.status}</span></td>
          <td><strong>${r.finalSellingTotal.toFixed(2)} SAR</strong></td>
          <td>
            <button class="btn btn-outline btn-sm" title="Agency Voucher" onclick="app.openConfirmationLetterModal('${r.id}')"><i class="fa-solid fa-file-invoice"></i></button>
            <button class="btn btn-emerald btn-sm" title="Guest Check-In Voucher" onclick="app.openGuestVoucherModal('${r.id}')"><i class="fa-solid fa-ticket"></i></button>
          </td>
        `;
        recentTbody.appendChild(tr);
      });

      this.renderHolidayCalendar();
    }

    renderHolidayCalendar(filter = this.calendarFilter) {
      this.calendarFilter = filter;
      const year = this.calendarCurrentDate.getFullYear();
      const month = this.calendarCurrentDate.getMonth();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      document.getElementById('cal-month-year-title').innerText = `${monthNames[month]} ${year}`;

      const grid = document.getElementById('calendar-days-grid');
      grid.innerHTML = '';

      const firstDay = new Date(year, month, 1).getDay();
      const totalDays = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="cal-day empty"></div>`;
      }

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const upcomingEvents = getHolidayEvents().filter(event => filter === 'all' || event.type === filter);

      for (let d = 1; d <= totalDays; d++) {
        const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dayStr === todayStr;
        const hasEvent = upcomingEvents.some(ev => ev.date === dayStr);

        grid.innerHTML += `
          <div class="cal-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}">
            ${d}
          </div>
        `;
      }

      const upcomingContainer = document.getElementById('upcoming-events-container');
      upcomingContainer.innerHTML = '';

      upcomingEvents.slice(0, 4).forEach(ev => {
        upcomingContainer.innerHTML += `
          <div class="event-item">
            <span class="event-name"><i class="fa-solid fa-star text-gold"></i> ${ev.title}</span>
            <span class="event-date">${new Date(`${ev.date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        `;
      });
      if (!upcomingEvents.length) upcomingContainer.innerHTML = '<div class="event-item"><span class="event-name">No upcoming occasions for this filter.</span></div>';
    }

    // RENDER RESERVATIONS MASTER REGISTRY TABLE WITH DUAL VOUCHER BUTTONS
    renderReservationsMasterTable() {
      const tbody = document.getElementById('master-res-tbody');
      tbody.innerHTML = '';

      const search = document.getElementById('filter-res-search').value.toLowerCase();
      const statusFilter = document.getElementById('filter-res-status').value;
      const cityFilter = document.getElementById('filter-res-city').value;
      const sourceFilter = document.getElementById('filter-res-source').value;

      const filtered = this.state.reservations.filter(r => {
        const matchSearch = r.guestName.toLowerCase().includes(search) ||
                            r.hotelName.toLowerCase().includes(search) ||
                            r.id.toLowerCase().includes(search) ||
                            r.hotelRef.toLowerCase().includes(search);
        const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const matchCity = cityFilter === 'ALL' || r.city === cityFilter;
        const matchSource = sourceFilter === 'ALL' || r.bookingType === sourceFilter;
        return matchSearch && matchStatus && matchCity && matchSource;
      });

      filtered.forEach(r => {
        const resPayments = this.state.payments.filter(p => p.resId === r.id).reduce((acc, p) => acc + p.amount, 0);
        let payStatusBadge = '<span class="badge badge-rose">UNPAID</span>';
        if (resPayments >= r.finalSellingTotal) {
          payStatusBadge = '<span class="badge badge-emerald">PAID</span>';
        } else if (resPayments > 0) {
          payStatusBadge = `<span class="badge badge-gold">PARTIAL (${resPayments.toFixed(0)})</span>`;
        }

        let roomBreakdown = r.rooms ? r.rooms.map(rm => `${rm.count}x ${rm.roomType}`).join(', ') : '1x Room';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${r.id}</strong><br><span class="small text-muted">${r.hotelRef}</span></td>
          <td><strong>${r.hotelName}</strong><br><span class="small text-muted">${r.city}</span></td>
          <td>${r.guestName}<br><span class="small text-muted">${r.guestNationality || ''}</span></td>
          <td>${r.bookingType}<br><span class="small text-gold">${r.agentName || ''}</span></td>
          <td>${r.checkIn} to ${r.checkOut}</td>
          <td>${r.nights}</td>
          <td><span class="badge badge-blue">${roomBreakdown}</span></td>
          <td><strong>${r.finalSellingTotal.toFixed(2)} SAR</strong></td>
          <td class="text-emerald">+${r.netProfit.toFixed(2)} SAR</td>
          <td><span class="badge ${r.status === 'Definite' ? 'badge-emerald' : r.status === 'Tentative' ? 'badge-gold' : 'badge-rose'}">${r.status}</span></td>
          <td>${payStatusBadge}</td>
          <td>
            <div class="filter-group">
              <button class="btn btn-outline btn-sm" title="Travel Agency Confirmation (With Rates)" onclick="app.openConfirmationLetterModal('${r.id}')"><i class="fa-solid fa-file-invoice"></i> Confirmation</button>
              <button class="btn btn-emerald btn-sm" title="Guest Check-In Voucher (No Rates)" onclick="app.openGuestVoucherModal('${r.id}')"><i class="fa-solid fa-ticket"></i> Voucher</button>
              <button class="btn btn-secondary btn-sm" title="Edit Booking" onclick="app.editReservation('${r.id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-rose btn-sm" title="Delete Booking" onclick="app.deleteReservation('${r.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    renderClientsTable() {
      const tbody = document.getElementById('clients-tbody');
      tbody.innerHTML = '';

      const search = document.getElementById('filter-client-search').value.toLowerCase();
      const typeFilter = document.getElementById('filter-client-type').value;

      const filtered = this.state.clients.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search) ||
                            (c.mobile && c.mobile.includes(search)) ||
                            (c.email && c.email.toLowerCase().includes(search));
        const matchType = typeFilter === 'ALL' || c.type === typeFilter;
        return matchSearch && matchType;
      });

      filtered.forEach(c => {
        const clientBookings = this.state.reservations.filter(r => r.agentName === c.name || r.guestName === c.name);
        const totalBilled = clientBookings.reduce((acc, r) => acc + (r.status !== 'Cancelled' ? r.finalSellingTotal : 0), 0);
        const totalPaid = this.state.payments.filter(p => p.clientName === c.name).reduce((acc, p) => acc + p.amount, 0);
        const balance = totalBilled - totalPaid;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${c.name}</strong></td>
          <td><span class="badge badge-blue">${c.type}</span></td>
          <td>${c.nat || 'N/A'}</td>
          <td>${c.mobile || '-'}</td>
          <td>${c.email || '-'}</td>
          <td>${c.address || '-'}</td>
          <td><strong>${clientBookings.length} Bookings</strong></td>
          <td class="${balance > 0 ? 'text-rose' : 'text-emerald'}"><strong>${balance.toFixed(2)} SAR</strong></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="app.openStatementForClient('${c.id}')"><i class="fa-solid fa-file-invoice-dollar"></i> Statement</button>
            <button class="btn btn-outline btn-sm" onclick="app.editClient('${c.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-rose btn-sm" title="Delete Client / Agent" onclick="app.deleteClient('${c.id}')"><i class="fa-solid fa-trash"></i></button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    saveClient() {
      const idVal = document.getElementById('client-id-val').value;
      const name = document.getElementById('client-name-val').value;
      const type = document.getElementById('client-type-val').value;
      const nat = document.getElementById('client-nat-val').value;
      const mobile = document.getElementById('client-mobile-val').value;
      const email = document.getElementById('client-email-val').value;
      const address = document.getElementById('client-address-val').value;

      let clientObj = {
        id: idVal || this.nextSequentialId('CLT-', 1000, this.state.clients),
        name,
        type,
        nat,
        mobile,
        email,
        address
      };

      if (idVal) {
        const idx = this.state.clients.findIndex(c => c.id === idVal);
        if (idx !== -1) this.state.clients[idx] = clientObj;
      } else {
        this.state.clients.push(clientObj);
      }

      this.saveState();
      this.closeModal('modal-client-form');
      this.populateSelectDropdowns();
      this.renderClientsTable();
      alert('Client entry saved successfully!');
    }

    editClient(id) {
      const c = this.state.clients.find(cl => cl.id === id);
      if (!c) return;

      document.getElementById('client-id-val').value = c.id;
      document.getElementById('client-name-val').value = c.name;
      document.getElementById('client-type-val').value = c.type;
      document.getElementById('client-nat-val').value = c.nat || 'Saudi Arabia';
      document.getElementById('client-mobile-val').value = c.mobile || '';
      document.getElementById('client-email-val').value = c.email || '';
      document.getElementById('client-address-val').value = c.address || '';

      document.getElementById('client-modal-title').innerText = `Edit Client / Agent (${c.name})`;
      this.openModal('modal-client-form');
    }

    deleteClient(id) {
      const client = this.state.clients.find(c => c.id === id);
      if (client && confirm(`Delete ${client.name} from the clients and agents directory? Existing reservation history will be retained.`)) {
        this.state.clients = this.state.clients.filter(c => c.id !== id);
        this.saveState();
        this.populateSelectDropdowns();
        this.renderClientsTable();
      }
    }

    // HOTEL MASTER DATA CRUD
    renderHotelsMasterTable() {
      const tbody = document.getElementById('hotels-master-tbody');
      tbody.innerHTML = '';

      this.state.hotels.forEach(h => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${h.name}</strong></td>
          <td><span class="badge badge-gold">${h.city}</span></td>
          <td>${'⭐'.repeat(h.stars)}</td>
          <td>${h.phone || '-'}</td>
          <td>
            <div class="filter-group">
              <button class="btn btn-secondary btn-sm" onclick="app.openEditHotelModal('${h.id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-rose btn-sm" onclick="app.deleteHotel('${h.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    openEditHotelModal(id) {
      const h = this.state.hotels.find(ht => ht.id === id);
      if (!h) return;

      document.getElementById('hotel-id-val').value = h.id;
      document.getElementById('hotel-name-val').value = h.name;
      document.getElementById('hotel-city-val').value = h.city;
      document.getElementById('hotel-stars-val').value = h.stars;
      document.getElementById('hotel-phone-val').value = h.phone || '';

      document.getElementById('hotel-modal-title').innerText = `Edit Hotel (${h.name})`;
      this.openModal('modal-hotel-form');
    }

    saveHotel() {
      const idVal = document.getElementById('hotel-id-val').value;
      const name = document.getElementById('hotel-name-val').value;
      const city = document.getElementById('hotel-city-val').value;
      const stars = parseInt(document.getElementById('hotel-stars-val').value) || 5;
      const phone = document.getElementById('hotel-phone-val').value;

      let hotelObj = {
        id: idVal || this.nextSequentialId('HTL-', 0, this.state.hotels),
        name,
        city,
        stars,
        phone
      };

      if (idVal) {
        const idx = this.state.hotels.findIndex(h => h.id === idVal);
        if (idx !== -1) this.state.hotels[idx] = hotelObj;
      } else {
        this.state.hotels.push(hotelObj);
      }

      this.saveState();
      this.closeModal('modal-hotel-form');
      this.populateSelectDropdowns();
      this.renderHotelsMasterTable();
      alert('Hotel master record saved successfully!');
    }

    deleteHotel(id) {
      if (confirm('Delete this hotel record from master data?')) {
        this.state.hotels = this.state.hotels.filter(h => h.id !== id);
        this.saveState();
        this.populateSelectDropdowns();
        this.renderHotelsMasterTable();
      }
    }

    // USER MANAGEMENT MODULE CRUD
    renderUsersTable() {
      const tbody = document.getElementById('users-tbody');
      tbody.innerHTML = '';

      this.state.users.forEach(u => {
        const badgeClass = u.role === 'Administrator' ? 'badge-purple' : u.role === 'Reservation Agent' ? 'badge-blue' : u.role === 'Accountant' ? 'badge-emerald' : 'badge-gold';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${u.name}</strong></td>
          <td><code>${u.username}</code></td>
          <td>${u.email || '-'}</td>
          <td><span class="badge ${badgeClass}">${u.role}</span></td>
          <td><span class="badge badge-emerald">${u.status}</span></td>
          <td>
            <div class="filter-group">
              <button class="btn btn-secondary btn-sm" onclick="app.openEditUserModal('${u.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
              ${u.id !== 'USR-1' ? `<button class="btn btn-rose btn-sm" onclick="app.deleteUser('${u.id}')"><i class="fa-solid fa-trash"></i> Delete</button>` : ''}
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    openEditUserModal(id) {
      const u = this.state.users.find(usr => usr.id === id);
      if (!u) return;

      document.getElementById('user-id-val').value = u.id;
      document.getElementById('user-fullname-val').value = u.name;
      document.getElementById('user-username-val').value = u.username;
      document.getElementById('user-role-val').value = u.role;
      document.getElementById('user-email-val').value = u.email || '';
      document.getElementById('user-password-val').value = u.password || '';

      document.getElementById('user-modal-title').innerText = `Edit User Account (${u.username})`;
      this.openModal('modal-user-form');
    }

    saveUser() {
      const idVal = document.getElementById('user-id-val').value;
      const name = document.getElementById('user-fullname-val').value;
      const username = document.getElementById('user-username-val').value;
      const role = document.getElementById('user-role-val').value;
      const email = document.getElementById('user-email-val').value;
      const password = document.getElementById('user-password-val').value;

      let userObj = {
        id: idVal || this.nextSequentialId('USR-', 0, this.state.users),
        name,
        username,
        role,
        email,
        password,
        status: 'Active'
      };

      if (idVal) {
        const idx = this.state.users.findIndex(u => u.id === idVal);
        if (idx !== -1) this.state.users[idx] = userObj;
      } else {
        this.state.users.push(userObj);
      }

      this.saveState();
      this.closeModal('modal-user-form');
      this.renderUserHeaderSwitcher();
      this.renderUsersTable();
      alert('User account saved successfully!');
    }

    deleteUser(id) {
      if (confirm('Delete this system user?')) {
        this.state.users = this.state.users.filter(u => u.id !== id);
        this.saveState();
        this.renderUserHeaderSwitcher();
        this.renderUsersTable();
      }
    }

    renderPaymentsView() {
      this.populateSelectDropdowns();
      document.getElementById('pay-date').value = new Date().toISOString().split('T')[0];
      this.updatePaymentAllocationFields();
      document.getElementById('paid-date').value = new Date().toISOString().split('T')[0];
      this.populatePaymentMadeRecipients();

      const tbody = document.getElementById('payments-history-tbody');
      tbody.innerHTML = '';

      this.state.payments.slice().reverse().forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.date}</td>
          <td><strong>${p.clientName}</strong></td>
          <td><span class="badge ${p.resId ? 'badge-blue' : 'badge-gold'}">${p.resId || 'Account Deposit'}</span></td>
          <td>${p.method}<br><span class="small text-muted">${p.ref || '-'}</span></td>
          <td class="text-emerald"><strong>${p.amount.toFixed(2)} SAR</strong></td>
          <td>
            <button class="btn btn-outline btn-sm" title="Download receipt" onclick="app.downloadPaymentReceipt('${p.id}', 'received')"><i class="fa-solid fa-receipt"></i></button>
            <button class="btn btn-rose btn-sm" onclick="app.deletePayment('${p.id}')"><i class="fa-solid fa-trash"></i></button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      const madeTbody = document.getElementById('payments-made-tbody');
      madeTbody.innerHTML = '';
      this.state.paymentsMade.slice().reverse().forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.date}</td><td><strong>${p.recipient}</strong><br><span class="small text-muted">${p.recipientType}</span></td><td>${p.resId || '-'}</td><td class="text-rose"><strong>${p.amount.toFixed(2)} SAR</strong></td><td><button class="btn btn-outline btn-sm" onclick="app.downloadPaymentReceipt('${p.id}', 'paid')"><i class="fa-solid fa-receipt"></i></button><button class="btn btn-rose btn-sm" onclick="app.deletePaymentMade('${p.id}')"><i class="fa-solid fa-trash"></i></button></td>`;
        madeTbody.appendChild(tr);
      });
    }

    populatePaymentMadeRecipients() {
      const type = document.getElementById('paid-recipient-type').value;
      const select = document.getElementById('paid-recipient');
      const recipients = type === 'Hotel' ? this.state.hotels.map(h => h.name) : this.state.clients.filter(c => c.type === 'Travel Agent' || c.type === 'Both').map(c => c.name);
      select.innerHTML = '<option value="" disabled selected>-- Select recipient --</option>' + recipients.map(name => `<option value="${name}">${name}</option>`).join('');
      this.populatePaymentMadeReservations();
    }

    populatePaymentMadeReservations() {
      const recipient = document.getElementById('paid-recipient').value;
      const type = document.getElementById('paid-recipient-type').value;
      const reservations = this.state.reservations.filter(r => type === 'Hotel' ? r.hotelName === recipient : r.agentName === recipient);
      document.getElementById('paid-res-id').innerHTML = '<option value="">-- Not allocated to a reservation --</option>' + reservations.map(r => `<option value="${r.id}">${r.id} - ${r.guestName}</option>`).join('');
    }

    savePaymentMade() {
      const recipient = document.getElementById('paid-recipient').value;
      if (!recipient) return;
      const payment = { id: this.nextSequentialId('PMD-', 1000, this.state.paymentsMade), date: document.getElementById('paid-date').value, recipientType: document.getElementById('paid-recipient-type').value, recipient, resId: document.getElementById('paid-res-id').value, amount: parseFloat(document.getElementById('paid-amount').value) || 0, method: document.getElementById('paid-method').value, ref: document.getElementById('paid-ref').value };
      this.state.paymentsMade.push(payment);
      this.saveState();
      alert(`Payment of ${payment.amount.toFixed(2)} SAR posted successfully.`);
      document.getElementById('payment-made-form').reset();
      this.renderPaymentsView();
    }

    deletePaymentMade(id) {
      if (confirm('Delete this payment made record?')) { this.state.paymentsMade = this.state.paymentsMade.filter(p => p.id !== id); this.saveState(); this.renderPaymentsView(); }
    }

    async addCompanyLogoToPdf(doc, x, y, width, height) {
      try {
        const blob = await fetch(encodeURI('verdan traverl.jpeg')).then(response => response.blob());
        const logo = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
        doc.addImage(logo, 'JPEG', x, y, width, height);
      } catch (error) { /* Documents remain usable if the logo cannot load. */ }
    }

    async downloadPaymentReceipt(id, type) {
      const payment = type === 'received' ? this.state.payments.find(p => p.id === id) : this.state.paymentsMade.find(p => p.id === id);
      if (!payment || !window.jspdf) return;
      const { jsPDF } = window.jspdf; const doc = new jsPDF();
      await this.addCompanyLogoToPdf(doc, 92, 10, 26, 20);
      doc.setFontSize(18); doc.text('Verdan Travel Company', 105, 36, { align: 'center' });
      doc.setFontSize(9); doc.text('CR No. 7053582503 | Travel & Tourism License No. 73109830', 105, 42, { align: 'center' });
      doc.setDrawColor(180); doc.line(20, 48, 190, 48);
      doc.setFontSize(16); doc.text(type === 'received' ? 'OFFICIAL PAYMENT RECEIPT' : 'PAYMENT MADE ADVICE', 105, 60, { align: 'center' });
      doc.setFontSize(11); const lines = [`Receipt No.: ${payment.id}`, `Receipt Date: ${this.formatDate(payment.date)}`, `${type === 'received' ? 'Received from' : 'Paid to'}: ${payment.clientName || payment.recipient}`, `Allocation: ${payment.resId || 'General account / deposit'}`, `Amount Received: ${payment.amount.toFixed(2)} SAR`, `Payment Method: ${payment.method}`, `Reference / Notes: ${payment.ref || payment.remarks || '-'}`];
      doc.setFillColor(248, 250, 252); doc.rect(20, 68, 170, 82, 'F'); lines.forEach((line, i) => doc.text(line, 28, 80 + i * 10));
      doc.line(28, 185, 85, 185); doc.line(125, 185, 182, 185); doc.setFontSize(9); doc.text('Authorized signature', 56, 191, { align: 'center' }); doc.text(type === 'received' ? 'Payer acknowledgement' : 'Recipient acknowledgement', 153, 191, { align: 'center' });
      doc.setFontSize(9); doc.text('Madina, Al Jouma district, Abu Shoraih Al Khozami street', 105, 280, { align: 'center' });
      doc.save(`${payment.id}-receipt.pdf`);
    }

    updatePaymentResDropdown() {
      const clientId = document.getElementById('pay-client-id').value;
      const client = this.state.clients.find(c => c.id === clientId);
      const resSelect = document.getElementById('pay-res-id');
      resSelect.innerHTML = '<option value="">-- General Account Deposit --</option>';

      if (client) {
        const clientResList = this.state.reservations.filter(r => r.agentName === client.name || r.guestName === client.name);
        clientResList.forEach(r => {
          resSelect.innerHTML += `<option value="${r.id}">${r.id} - ${r.hotelName} (${r.finalSellingTotal} SAR)</option>`;
        });
      }
      this.updatePaymentAllocationFields();
    }

    updatePaymentAllocationFields() {
      const isReservationPayment = document.getElementById('pay-allocation-type').value === 'Reservation';
      const reservationGroup = document.getElementById('pay-res-group');
      const reservationSelect = document.getElementById('pay-res-id');
      reservationGroup.style.display = isReservationPayment ? 'block' : 'none';
      reservationSelect.required = isReservationPayment;
      if (!isReservationPayment) reservationSelect.value = '';
    }

    savePayment() {
      const clientId = document.getElementById('pay-client-id').value;
      const client = this.state.clients.find(c => c.id === clientId);
      if (!client) return;

      const allocationType = document.getElementById('pay-allocation-type').value;
      const resId = (allocationType === 'Reservation') ? document.getElementById('pay-res-id').value : '';
      if (allocationType === 'Reservation' && !resId) {
        alert('Select a reservation before posting a reservation payment.');
        return;
      }
      const amount = parseFloat(document.getElementById('pay-amount').value) || 0;
      const date = document.getElementById('pay-date').value;
      const method = document.getElementById('pay-method').value;
      const ref = document.getElementById('pay-ref').value;
      const remarks = document.getElementById('pay-remarks').value;

      const payObj = {
        id: this.nextSequentialId('PAY-', 1000, this.state.payments),
        date,
        clientName: client.name,
        allocationType,
        resId,
        amount,
        method,
        ref,
        remarks
      };

      this.state.payments.push(payObj);
      this.saveState();
      alert(`Payment of ${amount.toFixed(2)} SAR posted successfully!`);

      document.getElementById('payment-form').reset();
      this.renderPaymentsView();
    }

    deletePayment(id) {
      if (confirm('Delete this payment entry?')) {
        this.state.payments = this.state.payments.filter(p => p.id !== id);
        this.saveState();
        this.renderPaymentsView();
      }
    }

    populateStatementClientSelect() { this.populateSelectDropdowns(); }

    openStatementForClient(clientId) {
      this.switchTab('account-statement');
      document.getElementById('stmt-client-select').value = clientId;
      this.generateAccountStatement();
    }

    generateAccountStatement() {
      const clientId = document.getElementById('stmt-client-select').value;
      const isHotelStatement = clientId.startsWith('HOTEL:');
      const client = isHotelStatement ? this.state.hotels.find(h => h.id === clientId.replace('HOTEL:', '')) : this.state.clients.find(c => c.id === clientId);
      if (!client) {
        alert('Please select a client, agent, or direct hotel to generate statement.');
        return;
      }

      document.getElementById('stmt-client-name').innerText = client.name;
      document.getElementById('stmt-client-type').innerText = isHotelStatement ? 'Direct Hotel Supplier Ledger' : client.type;
      document.getElementById('stmt-client-mobile').innerText = client.mobile || client.phone || 'N/A';
      document.getElementById('stmt-client-email').innerText = client.email || 'N/A';
      document.getElementById('stmt-generated-date').innerText = `Date: ${new Date().toISOString().split('T')[0]}`;

      let ledger = [];

      const clientResList = this.state.reservations.filter(r => (isHotelStatement ? (r.bookingType === 'Direct' && r.hotelName === client.name) : (r.agentName === client.name || r.guestName === client.name)) && r.status !== 'Cancelled');
      clientResList.forEach(r => {
        const roomDetails = (r.rooms || []).map(room => `${room.count}x ${room.roomType} @ ${room.salePerNight.toFixed(2)} SAR/night`).join('; ') || 'Room details not recorded';
        ledger.push({
          date: r.checkIn,
          ref: r.id,
          desc: `Hotel Stay: ${r.hotelName} | ${roomDetails} | ${r.mealPlan} | ${r.nights} night(s)`,
          debit: isHotelStatement ? r.purchaseCost : r.finalSellingTotal,
          credit: 0
        });
      });

      const clientPayments = isHotelStatement ? this.state.paymentsMade.filter(p => p.recipientType === 'Hotel' && p.recipient === client.name) : this.state.payments.filter(p => p.clientName === client.name);
      clientPayments.forEach(p => {
        ledger.push({
          date: p.date,
          ref: p.id,
          desc: `${isHotelStatement ? 'Payment Made' : 'Payment Received'} (${p.method}) ${p.ref ? `[Ref: ${p.ref}]` : ''} ${p.resId ? `[Against ${p.resId}]` : ''}`,
          debit: 0,
          credit: p.amount
        });
      });

      ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

      let runningBalance = 0, totalDebit = 0, totalCredit = 0;
      const tbody = document.getElementById('stmt-ledger-tbody');
      tbody.innerHTML = '';

      ledger.forEach(entry => {
        runningBalance += (entry.debit - entry.credit);
        totalDebit += entry.debit;
        totalCredit += entry.credit;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${entry.date}</td>
          <td><strong>${entry.ref}</strong></td>
          <td>${entry.desc}</td>
          <td class="text-right">${entry.debit > 0 ? entry.debit.toFixed(2) : '-'}</td>
          <td class="text-right">${entry.credit > 0 ? entry.credit.toFixed(2) : '-'}</td>
          <td class="text-right"><strong>${runningBalance.toFixed(2)}</strong></td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById('stmt-total-debit').innerText = totalDebit.toFixed(2) + ' SAR';
      document.getElementById('stmt-total-credit').innerText = totalCredit.toFixed(2) + ' SAR';
      document.getElementById('stmt-net-balance').innerText = runningBalance.toFixed(2) + ' SAR';
    }

    runCurrentReport() {
      const activeReportBtn = document.querySelector('.report-tab.active');
      if (!activeReportBtn) return;
      const type = activeReportBtn.getAttribute('data-report');

      const container = document.getElementById('report-output-container');
      container.innerHTML = '';

      if (type === 'arrivals') {
        let rows = '';
        this.state.reservations.forEach(r => {
          let roomStr = r.rooms ? r.rooms.map(rm => `${rm.count}x ${rm.roomType}`).join(', ') : '1x Room';
          rows += `
            <tr>
              <td>${r.checkIn}</td>
              <td><strong>${r.guestName}</strong></td>
              <td>${r.hotelName} (${r.city})</td>
              <td>${roomStr} (${r.nights} Nights)</td>
              <td>${r.agentName || 'Direct'}</td>
              <td><span class="badge badge-emerald">${r.status}</span></td>
            </tr>
          `;
        });

        container.innerHTML = `
          <h4><i class="fa-solid fa-plane-arrival text-gold"></i> Daily Guest Arrivals & Departures Master List</h4>
          <table class="data-table mt-3">
            <thead>
              <tr><th>Check-In Date</th><th>Guest Name</th><th>Hotel Name</th><th>Room & Nights</th><th>Booking Source</th><th>Status</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      } else if (type === 'revenue') {
        let totalSales = 0, totalCost = 0, totalProfit = 0;
        let rows = '';

        this.state.reservations.forEach(r => {
          if (r.status !== 'Cancelled') {
            totalSales += r.finalSellingTotal;
            totalCost += r.purchaseCost;
            totalProfit += r.netProfit;

            rows += `
              <tr>
                <td><strong>${r.id}</strong></td>
                <td>${r.hotelName}</td>
                <td>${r.guestName}</td>
                <td>${r.purchaseCost.toFixed(2)} SAR</td>
                <td>${r.finalSellingTotal.toFixed(2)} SAR</td>
                <td class="text-emerald">+${r.netProfit.toFixed(2)} SAR</td>
                <td>${r.profitMargin.toFixed(1)}%</td>
              </tr>
            `;
          }
        });

        container.innerHTML = `
          <div class="financial-summary-banner mb-3">
            <div class="fin-box"><span>Gross Sales Revenue</span><strong>${totalSales.toFixed(2)} SAR</strong></div>
            <div class="fin-box"><span>Agency Cost of Sales</span><strong>${totalCost.toFixed(2)} SAR</strong></div>
            <div class="fin-box"><span>Net Profit</span><strong class="text-emerald">${totalProfit.toFixed(2)} SAR</strong></div>
            <div class="fin-box"><span>Overall Profit Margin</span><strong class="text-blue">${((totalProfit/totalSales)*100).toFixed(1)}%</strong></div>
          </div>
          <table class="data-table mt-3">
            <thead>
              <tr><th>Res ID</th><th>Hotel</th><th>Guest</th><th>Cost Price</th><th>Selling Price</th><th>Profit</th><th>Margin %</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      } else if (type === 'collections') {
        let rows = '', total = 0;
        this.state.payments.forEach(p => {
          total += p.amount;
          rows += `
            <tr>
              <td>${p.date}</td>
              <td>${p.clientName}</td>
              <td>${p.resId || 'General Deposit'}</td>
              <td>${p.method}</td>
              <td>${p.ref || '-'}</td>
              <td class="text-emerald"><strong>${p.amount.toFixed(2)} SAR</strong></td>
            </tr>
          `;
        });

        container.innerHTML = `
          <h4><i class="fa-solid fa-money-bill-wave text-emerald"></i> Total Collections Received: ${total.toFixed(2)} SAR</h4>
          <table class="data-table mt-3">
            <thead>
              <tr><th>Date</th><th>Client Name</th><th>Allocation Target</th><th>Method</th><th>Reference</th><th>Amount Paid</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      } else if (type === 'occupancy') {
        container.innerHTML = `
          <div class="market-metrics-grid">
            <div class="market-metric">
              <span class="metric-label">DBL (Double Rooms)</span>
              <div class="metric-val-row"><span class="metric-val text-gold">45% Volume</span></div>
            </div>
            <div class="market-metric">
              <span class="metric-label">TRP & QUD Rooms</span>
              <div class="metric-val-row"><span class="metric-val text-emerald">38% Volume</span></div>
            </div>
            <div class="market-metric">
              <span class="metric-label">Suites & Luxury</span>
              <div class="metric-val-row"><span class="metric-val text-blue">17% Volume</span></div>
            </div>
          </div>
        `;
      }
      const reportDate = document.getElementById('rpt-date-picker').value;
      const hotel = document.getElementById('rpt-hotel-filter').value;
      container.insertAdjacentHTML('afterbegin', `<div class="report-document-header"><strong>Verdan Travel Company</strong><span>Operational & Financial Report | Generated: ${this.formatDate(new Date().toISOString().split('T')[0])}</span><span>Period: ${reportDate ? this.formatDate(reportDate) : 'All dates'} | Hotel: ${hotel === 'ALL' ? 'All hotels' : hotel} | Currency: SAR</span></div>`);
    }

    async exportCurrentReportPdf() {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('The PDF export library is still loading. Please try again in a moment.');
        return;
      }
      const activeReport = document.querySelector('.report-tab.active');
      const reportTitle = activeReport ? activeReport.innerText.trim().replace(/\s+/g, ' ') : 'Operational Report';
      const output = document.getElementById('report-output-container').innerText.trim();
      if (!output) {
        alert('Run a report before exporting it.');
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const lines = doc.splitTextToSize(output, pageWidth - 28);
      let y = 18;
      await this.addCompanyLogoToPdf(doc, 165, 8, 25, 18);
      doc.setFontSize(16);
      doc.text('Verdan Travel Company', 14, y);
      y += 8;
      doc.setFontSize(12);
      doc.text('CR No. 7053582503 | Travel & Tourism License No. 73109830', 14, y);
      y += 7;
      doc.setFontSize(9);
      doc.text(`${reportTitle} | Exported: ${this.formatDate(new Date().toISOString().split('T')[0])} | Currency: SAR`, 14, y);
      y += 8;
      doc.setFontSize(8);
      lines.forEach(line => {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = 15;
        }
        doc.text(line, 14, y);
        y += 4.5;
      });
      doc.setFontSize(8);
      doc.text('Madina, Al Jouma district, Abu Shoraih Al Khozami street', pageWidth / 2, pageHeight - 8, { align: 'center' });
      const safeTitle = reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      doc.save(`verdan-${safeTitle || 'report'}.pdf`);
    }

    renderAllViews() {
      this.populateSelectDropdowns();
      this.renderDashboard();
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const cloud = new CloudStore();
    const authScreen = document.getElementById('auth-screen');
    const appShell = document.getElementById('app-shell');
    const loginForm = document.getElementById('login-form');
    const organizationForm = document.getElementById('organization-form');
    const onboarding = document.getElementById('organization-onboarding');
    const message = document.getElementById('auth-message');
    const showMessage = (text, success = false) => {
      message.textContent = text;
      message.classList.toggle('success', success);
    };
    const setAuthBusy = busy => {
      document.getElementById('btn-login').disabled = busy;
      document.getElementById('btn-register').disabled = busy;
      document.getElementById('btn-github-login').disabled = busy;
    };
    const openApplication = async () => {
      const membership = await cloud.loadIdentity();
      if (!cloud.user) return;
      if (!membership) {
        loginForm.hidden = true;
        onboarding.hidden = false;
        showMessage('');
        return;
      }
      window.app = new PMSApp(cloud);
      await window.app.hydrateCloudState();
      window.app.setCloudStatus('Connected · shared Supabase workspace');
      authScreen.hidden = true;
      appShell.hidden = false;
    };

    if (!cloud.ready) {
      showMessage('Setup required: add the Supabase Project URL and publishable key in supabase/config.js.');
      setAuthBusy(true);
      return;
    }

    loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      setAuthBusy(true);
      showMessage('Signing in…', true);
      try {
        await cloud.signIn(document.getElementById('login-email').value.trim(), document.getElementById('login-password').value);
        await openApplication();
      } catch (error) {
        showMessage(error.message || 'Unable to sign in.');
      } finally { setAuthBusy(false); }
    });

    document.getElementById('btn-register').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!loginForm.reportValidity()) return;
      setAuthBusy(true);
      showMessage('Creating account…', true);
      try {
        const { data, error } = await cloud.client.auth.signUp({
          email,
          password,
          options: { data: { full_name: email.split('@')[0] }, emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        if (data.session) await openApplication();
        else showMessage('Account created. Check your email for the confirmation link, then sign in.', true);
      } catch (error) {
        showMessage(error.message || 'Unable to create account.');
      } finally { setAuthBusy(false); }
    });

    document.getElementById('btn-github-login').addEventListener('click', async () => {
      setAuthBusy(true);
      showMessage('Redirecting to GitHub…', true);
      try {
        const { error } = await cloud.client.auth.signInWithOAuth({
          provider: 'github',
          options: { redirectTo: window.location.origin }
        });
        if (error) throw error;
      } catch (error) {
        showMessage(error.message || 'GitHub sign-in failed.');
        setAuthBusy(false);
      }
    });

    organizationForm.addEventListener('submit', async event => {
      event.preventDefault();
      const button = organizationForm.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        await cloud.createOrganization(document.getElementById('organization-name').value.trim());
        loginForm.hidden = false;
        onboarding.hidden = true;
        await openApplication();
      } catch (error) {
        document.getElementById('organization-message').textContent = error.message || 'Unable to create workspace.';
      } finally { button.disabled = false; }
    });

    document.getElementById('btn-onboarding-signout').addEventListener('click', async () => {
      await cloud.signOut();
      window.location.reload();
    });

    document.getElementById('btn-logout').addEventListener('click', async () => {
      await cloud.signOut();
      window.location.reload();
    });

    cloud.client.auth.getSession().then(({ data, error }) => {
      if (error) showMessage(error.message || 'Unable to restore your session.');
      else if (data.session) openApplication().catch(authError => showMessage(authError.message || 'Unable to load the shared workspace.'));
    });
  });

})();
