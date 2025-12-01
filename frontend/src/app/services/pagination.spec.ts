import { asHttpParams, PageOptions } from './pagination';

describe('Pagination Helper', () => {
  it('should create http params from options', () => {
    const options: PageOptions<any> = {
      page: 1,
      size: 20,
      sort: { property: 'name', order: 'asc' }
    };
    const params = asHttpParams(options);
    expect(params.get('page')).toBe('1');
    expect(params.get('size')).toBe('20');
    expect(params.get('sortProperty')).toBe('name');
    expect(params.get('sortOrder')).toBe('asc');
  });
});
