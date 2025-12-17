"use client";
import { useQuery } from "@apollo/client";
import { ME_QUERY } from "@/lib/graphql/projects";
import { IconCircleCheckFilled, IconX, IconDownload } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export const FileStatusCell = ({ row, docType }: { row: any, docType: string }) => {
    const { data: meData } = useQuery(ME_QUERY);
    const userRole = meData?.me.role.name;

    const docs = row.original.project.stages?.administrative?.documents || [];
    const file = docs.find((doc: { fileName: string, fileUrl?: string }) => doc.fileName === docType);

    if (userRole === 'PROPOSAL_MANAGER') {
        return file ? <IconCircleCheckFilled className="text-green-500 mx-auto" /> : <IconX className="text-red-500 mx-auto" />;
    }

    if (file && file.fileUrl) {
        // 1. Determine Base URL
        let baseUrl = 'https://backoffice.urbagroupe.ma'; // Default Prod

        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            baseUrl = 'http://localhost:5002'; // Dev
        }

        // 2. Clean Path (remove leading slash if present)
        const cleanPath = file.fileUrl.startsWith('/') ? file.fileUrl.slice(1) : file.fileUrl;

        // 3. Construct URL
        const downloadUrl = `${baseUrl}/${cleanPath}`;

        return (
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" title={`Télécharger ${file.fileName}`} className="flex justify-center">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <IconDownload className="h-5 w-5 text-primary" />
                </Button>
            </a>
        );
    }

    return <span className="text-muted-foreground mx-auto">N/A</span>;
};