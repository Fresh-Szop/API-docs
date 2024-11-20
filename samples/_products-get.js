import z from "zod"

/**
 * @typedef {"availability"|"name"|"price"} orderField
 * @typedef {"asc"|"desc"} orderDir
 * @typedef{`${orderField}-${orderDir}`} ordering
 * @typedef {"vegetable"|"fruit"|"ingredients"} categories
 */

/**
 * @typedef {object} option
 * @property  {number|undefined} [pageSize]
 * @property  {number|undefined} [timeTravelMonth]
 * @typedef {option|undefined} options
 */

/**
 * @param {ordering} order
 * @param {boolean|undefined} isFresh
 * @param {categories} category
 * @param {boolean|undefined} discount
 * @param {number|undefined} priceMin
 * @param {number|undefined} priceMax
 * @param {options|undefined} options
 */
async function getProducts(
	order, isFresh, category, discount, priceMin, priceMax, options
) {
	
}
