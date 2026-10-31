<?php
// utils/stats_manager.php - Métricas y estadísticas avanzadas CATA 2026
require_once __DIR__ . '/../models.php';

class StatsManager {
    /**
     * Obtiene estadísticas del dashboard con filtros opcionales por sede y salón (NGS)
     */
    public static function get_dashboard_stats($sede = null, $ngs = null) {
        $whereVoters = [];
        $paramsVoters = [];
        $whereVotos = [];
        $paramsVotos = [];

        if ($sede && $sede !== 'todos') {
            $whereVoters[] = 'sede = :sede';
            $paramsVoters['sede'] = $sede;
            $whereVotos[] = 'sede = :sede';
            $paramsVotos['sede'] = $sede;
        }

        if ($ngs && $ngs !== 'todos') {
            $whereVoters[] = 'ngs = :ngs';
            $paramsVoters['ngs'] = $ngs;
            $whereVotos[] = 'ngs = :ngs';
            $paramsVotos['ngs'] = $ngs;
        }

        // Total alumnos (según filtro)
        $sqlTotal = 'SELECT COUNT(*) FROM voters';
        if (!empty($whereVoters)) {
            $sqlTotal .= ' WHERE ' . implode(' AND ', $whereVoters);
        }
        $total_alumnos = (int)db_query($sqlTotal, $paramsVoters)->fetchColumn();

        // Total votos emitidos (según filtro)
        $sqlVotos = 'SELECT COUNT(*) FROM votos';
        if (!empty($whereVotos)) {
            $sqlVotos .= ' WHERE ' . implode(' AND ', $whereVotos);
        }
        $votos_emitidos = (int)db_query($sqlVotos, $paramsVotos)->fetchColumn();

        // Porcentaje de participación
        $porcentaje_participacion = ($total_alumnos > 0) ? round(($votos_emitidos / $total_alumnos) * 100, 1) : 0.0;

        // Candidatos y votos individuales
        $candidatos = db_query('SELECT id, nombre FROM candidatos ORDER BY id ASC')->fetchAll();

        $resultados = [];
        $chart_labels = [];
        $chart_data = [];

        foreach ($candidatos as $c) {
            $sqlC = 'SELECT COUNT(*) FROM votos WHERE candidato_id = :cid';
            $paramsC = ['cid' => $c['id']];
            if (!empty($whereVotos)) {
                $sqlC .= ' AND ' . implode(' AND ', $whereVotos);
                $paramsC = array_merge($paramsC, $paramsVotos);
            }

            $votos_c = (int)db_query($sqlC, $paramsC)->fetchColumn();
            $pct_c = ($votos_emitidos > 0) ? round(($votos_c / $votos_emitidos) * 100, 1) : 0.0;

            $resultados[] = [
                'id' => (int)$c['id'],
                'nombre' => $c['nombre'],
                'votos' => $votos_c,
                'porcentaje' => $pct_c
            ];

            $chart_labels[] = $c['nombre'];
            $chart_data[] = $votos_c;
        }

        // Ordenar candidatos por cantidad de votos descendente
        usort($resultados, function($a, $b) {
            return $b['votos'] <=> $a['votos'];
        });

        // Sedes y NGS disponibles en el padrón
        $listas = getDistinctSedesAndNGS();

        return [
            'total_alumnos' => $total_alumnos,
            'votos_emitidos' => $votos_emitidos,
            'porcentaje_participacion' => $porcentaje_participacion,
            'resultados' => $resultados,
            'chart_labels' => $chart_labels,
            'chart_data' => $chart_data,
            'filtro_actual' => [
                'sede' => $sede ?: 'todos',
                'ngs' => $ngs ?: 'todos'
            ],
            'sedes_disponibles' => $listas['sedes'],
            'ngs_disponibles' => $listas['ngs']
        ];
    }
}