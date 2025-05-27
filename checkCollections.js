const { client, database, config } = require('./lib/appwriteConfig');

const checkCollections = async () => {
    try {
        console.log('Database ID:', config.databaseId);
        console.log('Collections config:', config.collections);
        
        // Try to fetch collections
        console.log('Checking tests collection:', config.collections.tests);
        const testsCollection = await database.getCollection(
            config.databaseId,
            config.collections.tests
        );
        console.log('Tests collection found:', testsCollection.name);
        
        console.log('Checking exams collection:', config.collections.exams);
        const examsCollection = await database.getCollection(
            config.databaseId,
            config.collections.exams
        );
        console.log('Exams collection found:', examsCollection.name);
        
        console.log('Checking questions collection:', config.collections.questions);
        const questionsCollection = await database.getCollection(
            config.databaseId,
            config.collections.questions
        );
        console.log('Questions collection found:', questionsCollection.name);
        
        console.log('Checking submissions collection:', config.collections.submissions);
        const submissionsCollection = await database.getCollection(
            config.databaseId,
            config.collections.submissions
        );
        console.log('Submissions collection found:', submissionsCollection.name);
        
    } catch (error) {
        console.error('Error checking collections:', error);
    }
};

checkCollections(); 