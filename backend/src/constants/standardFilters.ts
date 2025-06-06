export const STANDARD_FILTERS = {
  'requests-table': [
    {
      name: 'Aktuell',
      conditions: [{ column: 'status', operator: 'not_equals', value: 'archived' }],
      operators: []
    },
    {
      name: 'Archiv', 
      conditions: [{ column: 'status', operator: 'equals', value: 'archived' }],
      operators: []
    }
  ],
  'worktracker-todos': [
    {
      name: 'Aktuell',
      conditions: [{ column: 'status', operator: 'not_equals', value: 'done' }],
      operators: []
    },
    {
      name: 'Archiv',
      conditions: [{ column: 'status', operator: 'equals', value: 'done' }], 
      operators: []
    }
  ],
  'role-management': [
    {
      name: 'Alle',
      conditions: [],
      operators: []
    }
  ],
  'active-users-table': [
    {
      name: 'Aktive', 
      conditions: [{ column: 'active', operator: 'equals', value: 'true' }],
      operators: []
    }
  ],
  'invoice-management': [
    {
      name: 'Offen',
      conditions: [{ column: 'status', operator: 'in', value: 'DRAFT,SENT' }],
      operators: []
    },
    {
      name: 'Bezahlt',
      conditions: [{ column: 'status', operator: 'equals', value: 'PAID' }],
      operators: []
    }
  ],
  'user-management-table': [
    {
      name: 'Aktive',
      conditions: [{ column: 'active', operator: 'equals', value: 'true' }],
      operators: []
    },
    {
      name: 'Alle',
      conditions: [],
      operators: []
    }
  ],
  'user-worktime-table': [
    {
      name: 'Diese Woche',
      conditions: [{ column: 'startTime', operator: 'this_week', value: '__THIS_WEEK__' }],
      operators: []
    },
    {
      name: 'Alle',
      conditions: [],
      operators: []
    }
  ]
} as const; 