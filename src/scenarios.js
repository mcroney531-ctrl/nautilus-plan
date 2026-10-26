/* Tickets: people, requests in their own voice, and the records that carry authority. */
const SCENARIOS = {
  elena: {
    tab: 'Elena', kind: 'Issue', time: 7.25, day: 'Tue', date: '2026-10-27', start: 'outW', targets: ['kelp', 'touch', 'classroom'],
    person: { id: 'elena', name: 'Elena Park', initials: 'EP', role: 'Marine educator · starts Tuesday',
      credential: { active: true, groups: [], exceptions: [] },
      authorizations: [{ id: 'WA-1041', status: 'approved', purpose: 'Education program staff', approver: 'J. Okoye, Education Manager',
        doors: ['D-WSE', 'D-WGC', 'D-LSG', 'D-CLS'], places: 'West Staff Entrance, galleries (pre-open), Living Shore, Classroom', window: 'Daily 06:30–18:00' }] },
    message: 'Hi! I start Tuesday. I\'m running the 9:00 school program in Kelp Hall, the Living Shore touch pool, and the classroom, and I\'ll be in around 7:15 to set up. Can you get my badge ready?',
    editable: ['allStaff', 'education', 'exhibitOps', 'diveCrew'],
  },
  marcus: {
    tab: 'Marcus', kind: 'Diagnose', time: 5.5, day: 'Tue', date: '2026-10-27', start: 'outD', targets: ['dive', 'topside'],
    person: { id: 'marcus', name: 'Marcus Reyes', initials: 'MR', role: 'Dive crew lead',
      credential: { active: true, groups: ['diveCrew'], exceptions: [] },
      authorizations: [
        { id: 'Dive Crew role', status: 'approved', purpose: 'Standing role access', approver: 'Curator of Husbandry',
          doors: ['D-DOCK', 'D-EC1', 'D-EM', 'D-DIVE', 'D-TOPE'], places: 'Dock, east core, east mezzanine, dive locker, tank-top', window: 'Daily 07:00–19:00' },
        { id: 'WO-2291', status: 'approved', purpose: 'Pre-inspection Reef Tunnel cleaning (one-time)', approver: 'Curator of Husbandry',
          doors: ['D-DOCK', 'D-EC1', 'D-EM', 'D-DIVE', 'D-TOPE'], places: 'Dock, east core, east mezzanine, dive locker, tank-top', window: 'Tue Oct 27 · 05:00–08:00 · Marcus Reyes only',
          exception: { doors: ['D-DOCK', 'D-EC1', 'D-EM', 'D-DIVE', 'D-TOPE'], window: [5, 8], day: 'Tue', source: 'WO-2291' } }] },
    message: 'Heads up: we\'ve got one early Reef Tunnel scrub before Tuesday\'s inspection. Crew normally starts at seven, but I\'m due at the dock at 5:30. Badge should be fine, right?',
    editable: ['allStaff', 'education', 'exhibitOps', 'diveCrew'],
    groupScheduleEdit: { group: 'diveCrew', to: [5, 19] },
  },
};
if (typeof module !== 'undefined') module.exports = SCENARIOS;
