import { describe, expect, it } from 'vitest';
import { emptyLead, filterLeads } from './radarModel.js';

describe('filterLeads', () => {
    const leads = [
        emptyLead({ id: '1', name: 'Maya Fujita', location: 'Tokyo, Japan', regionKey: 'tokyo' }),
        emptyLead({ id: '2', name: 'Priya Shah', location: 'London, United Kingdom', regionKey: 'uk' }),
    ];

    it('matches region against location or regionKey', () => {
        expect(filterLeads(leads, { region: 'Tokyo' }).map((l) => l.id)).toEqual(['1']);
        expect(filterLeads(leads, { region: 'uk' }).map((l) => l.id)).toEqual(['2']);
        expect(filterLeads(leads, { region: 'Japan' }).map((l) => l.id)).toEqual(['1']);
    });
});
