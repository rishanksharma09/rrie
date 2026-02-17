import fetch from 'node-fetch';

const verifyStatusUpdate = async () => {
    const email = 'rishanksharma04524@gmail.com';
    const apiUrl = 'http://localhost:5000/api/hospital';

    try {
        // 1. Set status to 'overloaded'
        console.log("Setting status to 'overloaded'...");
        const updateResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                updates: { status: 'overloaded' }
            })
        });
        const updateData = await updateResponse.json();
        console.log('Update Response Status:', updateResponse.status);
        console.log('Updated Hospital Status:', updateData.hospital?.status);

        if (updateData.hospital?.status !== 'overloaded') {
            throw new Error('Failed to update status to overloaded');
        }

        // 2. Fetch to verify persistence
        console.log("Fetching to verify persistence...");
        const fetchResponse = await fetch(`${apiUrl}?email=${email}`);
        const fetchData = await fetchResponse.json();
        console.log('Fetched Hospital Status:', fetchData.status);

        if (fetchData.status !== 'overloaded') {
            throw new Error('Persistence verification failed');
        }

        // 3. Reset to 'active'
        console.log("Resetting status to 'active'...");
        await fetch(apiUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                updates: { status: 'active' }
            })
        });
        console.log('Reset complete.');

    } catch (error) {
        console.error('Verification Error:', error);
    }
};

verifyStatusUpdate();
