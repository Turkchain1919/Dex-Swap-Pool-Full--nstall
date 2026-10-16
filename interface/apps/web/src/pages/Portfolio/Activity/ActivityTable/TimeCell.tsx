import { Flex, Text, TextCompatProps } from '@universe/mycelium'
import { memo, useContext, useMemo } from 'react'
import { useFormattedTimeForActivity } from 'uniswap/src/components/activity/hooks/useFormattedTime'
import { GroupHoverTransition } from 'uniswap/src/components/GroupHoverTransition'
import { FORMAT_TIME_SHORT, useLocalizedDayjs } from 'uniswap/src/features/language/localizedDayjs'
import { TableRowHoverContext } from '~/components/Table/TableRowHoverContext'

const FORMAT_DATE_WITH_WEEKDAY = 'ddd MMM D, YYYY'
const CELL_HEIGHT = 36

interface TimeCellProps {
  timestamp: number
  showFullDateOnHover?: boolean
  textAlign?: TextCompatProps['textAlign']
}

function TimeCellInner({ timestamp, showFullDateOnHover = false, textAlign = 'left' }: TimeCellProps) {
  const formattedTime = useFormattedTimeForActivity(timestamp)
  const localizedDayjs = useLocalizedDayjs()
  const rowHovered = useContext(TableRowHoverContext)

  const { dateLine, timeLine } = useMemo(() => {
    const date = localizedDayjs(timestamp)
    return {
      dateLine: date.format(FORMAT_DATE_WITH_WEEKDAY),
      timeLine: date.format(FORMAT_TIME_SHORT),
    }
  }, [timestamp, localizedDayjs])

  return (
    <GroupHoverTransition
      showTransition={showFullDateOnHover}
      isHovered={rowHovered}
      height={CELL_HEIGHT}
      defaultContent={
        <Flex
          height={CELL_HEIGHT}
          justifyContent="center"
          alignItems={textAlign === 'right' ? 'flex-end' : 'flex-start'}
        >
          <Text variant="body3" color="$neutral2" textAlign={textAlign} width="100%">
            {formattedTime}
          </Text>
        </Flex>
      }
      hoverContent={
        <Flex
          height={CELL_HEIGHT}
          justifyContent="center"
          alignItems={textAlign === 'right' ? 'flex-end' : 'flex-start'}
        >
          <Text variant="body3" color="$neutral2" textAlign={textAlign} width="100%">
            {dateLine}
          </Text>
          <Text variant="body3" color="$neutral2" textAlign={textAlign} width="100%">
            {timeLine}
          </Text>
        </Flex>
      }
    />
  )
}

export const TimeCell = memo(TimeCellInner)
