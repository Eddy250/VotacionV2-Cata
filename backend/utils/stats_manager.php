<?php
// utils/stats_manager.php - Backend Puente: Métricas y estadísticas avanzadas CATA 2026
require_once __DIR__ . '/../models.php';

class StatsManager {

    /**
     * Calcula estadísticas para una sede específica ('central' o 'jerusalen')
     */
    private static function _calc_single_sede_stats($sedeSlug, $ngs = null) {
        $whereVoters = [];
        $paramsVoters = [];
        $whereVotos = [];
        $paramsVotos = [];

        if ($ngs && $ngs !== 'todos') {
            $whereVoters[] = 'ngs = :ngs';
            $paramsVoters['ngs'] = $ngs;
            $whereVotos[] = 'ngs = :ngs';
            $paramsVotos['ngs'] = $ngs;
        }

        // Total alumnos
        $sqlTotal = 'SELECT COUNT(*) FROM voters';
        if (!empty($whereVoters)) {
            $sqlTotal .= ' WHERE ' . implode(' AND ', $whereVoters);
        }
        $total_alumnos = (int)db_query($sqlTotal, $paramsVoters, $sedeSlug)->fetchColumn();

        // Total votos emitidos
        $sqlVotos = 'SELECT COUNT(*) FROM votos';
        if (!empty($whereVotos)) {
            $sqlVotos .= ' WHERE ' . implode(' AND ', $whereVotos);
        }
        $votos_emitidos = (int)db_query($sqlVotos, $paramsVotos, $sedeSlug)->fetchColumn();

        $porcentaje_participacion = ($total_alumnos > 0) ? round(($votos_emitidos / $total_alumnos) * 100, 1) : 0.0;

        // Candidatos de esta sede
        $candidatos = db_query('SELECT id, nombre, foto, logo, sede FROM candidatos ORDER BY id ASC', [], $sedeSlug)->fetchAll();

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

            $votos_c = (int)db_query($sqlC, $paramsC, $sedeSlug)->fetchColumn();
            $pct_c = ($votos_emitidos > 0) ? round(($votos_c / $votos_emitidos) * 100, 1) : 0.0;

            $resultados[] = [
                'id' => (int)$c['id'],
                'nombre' => $c['nombre'],
                'foto' => $c['foto'],
                'logo' => $c['logo'],
                'sede' => normalize_sede_name($sedeSlug),
                'votos' => $votos_c,
                'porcentaje' => $pct_c
            ];

            $chart_labels[] = $c['nombre'];
            $chart_data[] = $votos_c;
        }

        usort($resultados, function($a, $b) {
            return $b['votos'] <=> $a['votos'];
        });

        return [
            'sede' => normalize_sede_name($sedeSlug),
            'sede_slug' => $sedeSlug,
            'total_alumnos' => $total_alumnos,
            'votos_emitidos' => $votos_emitidos,
            'porcentaje_participacion' => $porcentaje_participacion,
            'resultados' => $resultados,
            'chart_labels' => $chart_labels,
            'chart_data' => $chart_data
        ];
    }

    /**
     * Backend Puente: Obtiene estadísticas con filtros opcionales o consolidado general
     */
    public static function get_dashboard_stats($sede = null, $ngs = null) {
        $listas = getDistinctSedesAndNGS();

        if ($sede && $sede !== 'todos') {
            $slug = normalize_sede_slug($sede);
            $stats = self::_calc_single_sede_stats($slug, $ngs);
            $stats['filtro_actual'] = [
                'sede' => normalize_sede_name($slug),
                'ngs' => $ngs ?: 'todos'
            ];
            $stats['sedes_disponibles'] = $listas['sedes'];
            $stats['ngs_disponibles'] = $listas['ngs'];
            return $stats;
        }

        // --- CONSOLIDADO GENERAL PUENTE (AMBAS SEDES) ---
        $centralStats = self::_calc_single_sede_stats('central', $ngs);
        $jeruStats = self::_calc_single_sede_stats('jerusalen', $ngs);

        $total_alumnos = $centralStats['total_alumnos'] + $jeruStats['total_alumnos'];
        $votos_emitidos = $centralStats['votos_emitidos'] + $jeruStats['votos_emitidos'];
        $porcentaje_participacion = ($total_alumnos > 0) ? round(($votos_emitidos / $total_alumnos) * 100, 1) : 0.0;

        $resultadosConsolidados = array_merge($centralStats['resultados'], $jeruStats['resultados']);
        usort($resultadosConsolidados, function($a, $b) {
            return $b['votos'] <=> $a['votos'];
        });

        $chart_labels = [];
        $chart_data = [];
        foreach ($resultadosConsolidados as $rc) {
            $chart_labels[] = $rc['nombre'] . ' (' . ($rc['sede'] === 'Sede Jerusalén' ? 'Jeru' : 'Cent') . ')';
            $chart_data[] = $rc['votos'];
        }

        return [
            'total_alumnos' => $total_alumnos,
            'votos_emitidos' => $votos_emitidos,
            'porcentaje_participacion' => $porcentaje_participacion,
            'resultados' => $resultadosConsolidados,
            'chart_labels' => $chart_labels,
            'chart_data' => $chart_data,
            'sedes_desglose' => [
                'central' => $centralStats,
                'jerusalen' => $jeruStats
            ],
            'filtro_actual' => [
                'sede' => 'todos',
                'ngs' => $ngs ?: 'todos'
            ],
            'sedes_disponibles' => $listas['sedes'],
            'ngs_disponibles' => $listas['ngs']
        ];
    }
}
