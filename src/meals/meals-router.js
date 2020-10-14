const path = require('path')
const express = require('express')
const MealsService = require('./meals-service')
const { requireAuth } = require('../middleware/jwt-auth')

const mealsRouter = express.Router()
const jsonParser = express.json()

const serializeMeal = meal => ({
    id: meal.id,
    day: meal.day,
    recipe_id: meal.recipe_id,
    user_id: meal.user_id
})

mealsRouter
    .route('/')
    .all(requireAuth)
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        MealsService.getAllMeals(knexInstance)
            .then(meals => {
                // res.json(meals.map(serializeMeal))
                res.json(meals.reduce((acc, item) => ({
                    ...acc, [item.day]: meals.filter( (i) => i.day === item.day)
                }), {} ))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { day, recipe_id } = req.body
        const newMeal = { day, recipe_id }
        console.log(`NEWMEAL:`, newMeal)
        for (const [key, value] of Object.entries(newMeal))
            if (value == null)
                return res.status(400).json({
                    error: { message: `Missing '${key}' in request body` }
                })
        
        newMeal.user_id = req.user.id
        
        const knexInstance = req.app.get('db')
        MealsService.insertMeal(knexInstance, newMeal)
                .then(meal => {
                    res
                        .status(201)
                        .location(path.posix.join(req.originalUrl, `/${meal.id}`))
                        .json(serializeMeal(meal))
                })
                .catch(next)
    })

mealsRouter
    .route('/:meal_id')
    .all(requireAuth)
    .all((req, res, next) => {
        const knexInstance = req.app.get('db')
        MealsService.getById(knexInstance, req.params.meal_id)
            .then(meal => {
                if (!meal) {
                    return res.status(404).json({
                        error: { message: `Meal doesn't exist` }
                    })
                }
                res.meal = meal
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.json(serializeMeal(res.meal))
    })
    .delete((req, res, next) => {
        const knexInstance = req.app.get('db')
        MealsService.deleteMeal(knexInstance, req.params.meal_id)
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })
 
module.exports = mealsRouter