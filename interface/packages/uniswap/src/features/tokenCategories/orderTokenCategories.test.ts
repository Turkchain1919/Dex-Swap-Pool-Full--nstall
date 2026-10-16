import { orderTokenCategories } from 'uniswap/src/features/tokenCategories/orderTokenCategories'
import { tokenCategory } from 'uniswap/src/test/fixtures/tokenCategory'

describe(orderTokenCategories, () => {
  const defi = tokenCategory({ id: 'id-defi', name: 'DeFi' })
  const gaming = tokenCategory({ id: 'id-gaming', name: 'Gaming' })
  const agents = tokenCategory({ id: 'id-agents', name: 'Agents' })
  const categories = [defi, gaming, agents]

  it('keeps server order when no config order is set', () => {
    expect(orderTokenCategories({ categories, orderedCategoryIds: [] })).toEqual([defi, gaming, agents])
  })

  it('pins configured categories first in config order, then the rest in server order', () => {
    expect(orderTokenCategories({ categories, orderedCategoryIds: ['id-agents', 'id-gaming'] })).toEqual([
      agents,
      gaming,
      defi,
    ])
  })

  it('ignores config ids that are not in the category list', () => {
    expect(orderTokenCategories({ categories, orderedCategoryIds: ['id-unknown', 'id-gaming'] })).toEqual([
      gaming,
      defi,
      agents,
    ])
  })
})
