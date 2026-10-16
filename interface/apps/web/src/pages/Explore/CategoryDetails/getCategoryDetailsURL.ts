/** Backend category ids are the URL slugs the Category Details route resolves. */
export function getCategoryDetailsURL(categoryId: string): string {
  return `/explore/category/${encodeURIComponent(categoryId)}`
}
