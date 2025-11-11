// Script dyal tnḍaf (run it with node, ex: node cleanDb.js)
// 1. Connecti l-database
// 2. 7ett l-models dyal Project w Document

const cleanCorruptDocuments = async () => {
    console.log("Kaybda tnḍaf...");
    const projects = await Project.find({
        "stages.technical.documents": { $elemMatch: { $type: "object" } }
    });

    console.log(`Lqina ${projects.length} projets fihom data m-kherbq.`);

    for (const project of projects) {
        let needsSave = false;

        // Nqelbo 3la l-objects l-m-kherbqin
        const corruptDocs = project.stages.technical.documents.filter(doc =>
            typeof doc === 'object' && doc !== null && !doc._bsontype // Ma'chi ObjectId
        );

        if (corruptDocs.length > 0) {
            console.log(`Kayn ${corruptDocs.length} docs m-kherbqin f projet ${project.projectCode}`);

            // 1. N-creyiw documents 7qiqiyin
            const newDocIds = [];
            for (const docData of corruptDocs) {
                // T2kked l-data mzyana
                if (docData.fileName && docData.fileUrl && docData.uploadedBy) {
                    const newDoc = await Document.create({
                        fileName: docData.fileName,
                        fileUrl: docData.fileUrl,
                        originalFileName: docData.originalFileName || docData.fileName,
                        uploadedBy: docData.uploadedBy,
                        createdAt: docData.createdAt || new Date(),
                    });
                    newDocIds.push(newDoc._id);
                    console.log(` - Creena document 7qiqi: ${newDoc._id}`);
                }
            }

            // 2. N7eydo l-data l-m-kherbq w n-zido l-IDs l-s7a7
            project.stages.technical.documents = project.stages.technical.documents.filter(doc =>
                typeof doc !== 'object' || (doc._bsontype && doc._bsontype === 'ObjectId') // Khlli ghir l-ObjectIds
            );

            // Zid l-IDs l-jdad
            project.stages.technical.documents.push(...newDocIds);

            needsSave = true;
        }

        if (needsSave) {
            await project.save();
            console.log(`S7e7na l-projet ${project.projectCode}`);
        }
    }
    console.log("Kmmelna tnḍaf.");
};

// 3awed had l-logic l ga3 l-stages (administrative, technicalOffer, etc.)
// ...