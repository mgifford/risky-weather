/**
 * Education Module
 * Provides lessons and awareness content about risk, probability, and climate
 */

const Education = (() => {
    const LESSONS = [
        {
            title: "Risk vs Probability",
            content: "Probability = the chance of something happening (e.g., 60% rain). Risk = what's at stake if it does. A 30% chance of rain might be low probability but HIGH risk if you're planning a wedding outdoors.",
            icon: "⚠️"
        },
        {
            title: "Why Models Disagree",
            content: "Each model uses different equations, start conditions, and computing power. When models agree, confidence is high. When they disagree, expect uncertainty. Good forecasts use multiple models (ensemble forecasting).",
            icon: "🎯"
        },
        {
            title: "Weather ≠ Climate",
            content: "Weather = what happens next Tuesday (models good for ~10 days). Climate = the 30-year trend (different models, longer data). A cold winter doesn't disprove climate warming—but warming stripes show the trend clearly over decades.",
            icon: "🌍"
        },
        {
            title: "Understanding Ensemble Forecasts",
            content: "No single model is perfect. Weather agencies run 20+ different models and look for agreement. Your app compares 2-3 models to teach you this principle: uncertainty decreases when predictions converge.",
            icon: "🎪"
        },
        {
            title: "Model Uncertainty Increases Over Time",
            content: "A 3-day forecast is 90%+ accurate. A 7-day forecast is only 70% accurate. A 14-day forecast drops to 50%. This is why long-range forecasts should never be trusted—chaos theory limits predictability.",
            icon: "📉"
        },
        {
            title: "What Temperature Disagreement Means",
            content: "If both models predict 8°C, confidence is high. If one says 2°C and another says 15°C, that's huge uncertainty—plan for the range, not the average. Large disagreement = high risk.",
            icon: "🌡️"
        },
        {
            title: "Precipitation Probability Explained",
            content: "100% doesn't mean it will rain all day. It means 'rain is certain to occur somewhere in the forecast area.' 30% means 'chance of rain is low, most areas will stay dry.' Plan accordingly.",
            icon: "💧"
        },
        {
            title: "Regional Models vs Global Models",
            content: "Regional models (like GEM) zoom into smaller areas with more detail, but only work 2-3 days ahead. Global models (like ECMWF) cover the whole Earth for 10+ days. This is why we blend them.",
            icon: "🗺️"
        },
        {
            title: "Climate Stripes Tell the Long-Term Story",
            content: "The warming stripes show annual temperatures from 1950-2023. Blue = cooler than normal. Red = warmer. The color trend shows climate is changing—independent of any single year's weather.",
            icon: "📊"
        },
        {
            title: "How Forecast Accuracy is Measured",
            content: "Tomorrow's forecast is usually accurate. After 5 days, errors grow. The scoreboard tracks which model predicted rain correctly (did it actually rain?), building an accuracy record over time.",
            icon: "✓"
        },
        {
            title: "What 'Chance of Rain' Actually Means",
            content: "It's a combined metric: probability × coverage. 40% might mean '80% chance in 50% of the area' or '40% chance everywhere.' Meteorologists report this, but it's complex. Higher % = more certainty.",
            icon: "🌧️"
        },
        {
            title: "Why Your Location Matters",
            content: "A model trained in North America might struggle with UK mountains. Regional models like GEM/ECMWF are tuned to their regions. This is why having local official sources (BBC, Met Office) is crucial.",
            icon: "📍"
        },
        {
            title: "Understanding Consensus",
            content: "When multiple independent climate models all show warming, that's consensus. 97% of climate scientists agree on human-caused warming because the evidence is strong. This app teaches you to trust ensemble agreement.",
            icon: "🤝"
        },
        {
            title: "The Butterfly Effect in Weather",
            content: "Tiny differences in initial conditions lead to totally different forecasts after 2 weeks (chaos theory). This limits predictability. Climate models have longer 'predictability horizons' because we care about trends, not exact days.",
            icon: "🦋"
        },
        {
            title: "Model Bias: What It Means",
            content: "Some models consistently predict warmer/colder or wetter/drier than reality. 'Bias' doesn't mean wrong—it means systematic error. Meteorologists know this and adjust. Your scoreboard reveals bias over time.",
            icon: "📐"
        },
        {
            title: "Why Ensemble Means Are Risky",
            content: "Averaging 2 models that predict 5°C and 20°C gives 12.5°C—but neither model predicts 12.5°! This is why ensembles show the range, not just the mean. Spread = uncertainty.",
            icon: "⚗️"
        },
        {
            title: "Climate Change Makes Extreme Weather Likelier",
            content: "Warmer atmosphere = more energy = more extreme events. A 1-in-100-year flood might become 1-in-50-year with climate change. This shifts risk—not just average temps, but the tails.",
            icon: "⛈️"
        },
        {
            title: "Model Skill Is Location-Dependent",
            content: "Coastal areas are harder to forecast (ocean affects local weather). Mountains create complex flows. Deserts are predictable. No model is equally skilled everywhere. Local forecasts are always more accurate.",
            icon: "⛰️"
        },
        {
            title: "Probabilities Compound",
            content: "If today has 40% rain and tomorrow has 40% rain, the chance of rain BOTH days is only 16% (0.4 × 0.4). Probabilities multiply, not add. This is why longer forecasts seem pessimistic.",
            icon: "🔗"
        },
        {
            title: "Climate Models Run for 100 Years",
            content: "Weather models run 10-15 days. Climate models project 50-100 years into the future, accounting for greenhouse gases. Different tools for different questions. Both are valid within their scope.",
            icon: "🔮"
        }
    ];

    /**
     * Get a random lesson
     */
    function getRandomLesson() {
        const index = Math.floor(Math.random() * LESSONS.length);
        return LESSONS[index];
    }

    /**
     * Get all lessons (for cycling through)
     */
    function getAllLessons() {
        return [...LESSONS];
    }

    /**
     * Get lesson by index
     */
    function getLessonByIndex(index) {
        return LESSONS[index % LESSONS.length];
    }

    /**
     * Get total number of lessons
     */
    function getLessonCount() {
        return LESSONS.length;
    }

    return {
        getRandomLesson,
        getAllLessons,
        getLessonByIndex,
        getLessonCount
    };
})();
