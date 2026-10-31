<?php
// utils/file_manager.php
require_once __DIR__ . '/../config.php';

/**
 * Check if a filename has an allowed extension
 */
function allowed_file($filename) {
    return '.' . pathinfo($filename, PATHINFO_EXTENSION) !== '' 
        && in_array(strtolower(pathinfo($filename, PATHINFO_EXTENSION)), ALLOWED_IMG_EXT);
}

function allowed_doc($filename) {
    return '.' . pathinfo($filename, PATHINFO_EXTENSION) !== '' 
        && in_array(strtolower(pathinfo($filename, PATHINFO_EXTENSION)), ALLOWED_DOC_EXT);
}

/**
 * Class for handling upload and saving of static files (like candidate photos)
 */
class FileManager {
    /**
     * Save an uploaded file and return its web-accessible path
     * @param $file - The uploaded file from $_FILES['foto']
     * @return string|null - Relative path like "img/filename.jpg" or null if invalid
     */
    public static function save_candidate_photo($file) {
        // Check if file was uploaded without errors
        if (!isset($file['error']) || is_array($file['error'])) {
            return null;
        }

        // Check for upload errors
        switch ($file['error']) {
            case UPLOAD_ERR_OK:
                break;
            case UPLOAD_ERR_NO_FILE:
                return null;
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                return null; // File too large
            default:
                return null;
        }

        // Check file size (optional: add a size limit if needed)
        // $maxSize = 5 * 1024 * 1024; // 5MB
        // if ($file['size'] > $maxSize) {
        //     return null;
        // }

        // Check MIME type or extension
        if (!allowed_file($file['name'])) {
            return null;
        }

        // Generate a safe filename
        $filename = basename($file['name']);
        // Remove any path information that might be included
        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $filename);
        // Ensure uniqueness
        $filename = uniqid('cand_', true) . '_' . $filename;

        // Ensure upload directory exists
        if (!is_dir(UPLOAD_DIR)) {
            mkdir(UPLOAD_DIR, 0755, true);
        }

        // Move uploaded file
        $destination = UPLOAD_DIR . '/' . $filename;
        if (move_uploaded_file($file['tmp_name'], $destination)) {
            // Return web-accessible path
            return "img/" . $filename;
        }

        return null;
    }

    /**
     * Save an uploaded PDF document and return its web-accessible path
     * @param $file - The uploaded file from $_FILES['propuestas_pdf']
     * @return string|null - Relative path like "docs/plan_xxx.pdf" or null if invalid
     */
    public static function save_candidate_doc($file) {
        if (!isset($file['error']) || is_array($file['error'])) {
            return null;
        }
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return null;
        }
        if (!allowed_doc($file['name'])) {
            return null;
        }

        $filename = basename($file['name']);
        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $filename);
        $filename = uniqid('plan_', true) . '_' . $filename;

        if (!is_dir(DOCS_DIR)) {
            @mkdir(DOCS_DIR, 0777, true);
        }

        $destination = DOCS_DIR . '/' . $filename;
        if (move_uploaded_file($file['tmp_name'], $destination)) {
            return "docs/" . $filename;
        }

        return null;
    }
}
?>